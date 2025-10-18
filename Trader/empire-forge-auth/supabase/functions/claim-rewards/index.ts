/**
 * claim-rewards edge function
 * POST /claim-rewards
 * 
 * Claims $OIL rewards based on motor power and network share
 * - Computes user MP from slotted units
 * - Reads network MP from v_network_motor_power
 * - Gets active season emission_per_hour
 * - Computes hours since last claim
 * - Credits user balance
 * - Inserts claim_history
 * - Triggers referral payouts (2.5% level-1, 1.25% level-2)
 */

import { svc, CORS, json, method, getActiveSeason } from "../_shared/db.ts";

Deno.serve(async (req: Request) => {
  const preflight = method(req, "POST");
  if (preflight) return preflight;

  try {
    const body = await req.json();
    const { wallet } = body;

    if (!wallet) {
      return json({ error: "wallet required" }, 400);
    }

    const supabase = svc();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, wallet_address, referrer_wallet")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "Profile not found" }, 404);
    }

    // Get active season
    const season = await getActiveSeason(supabase);
    const emissionPerHour = parseFloat(season.emission_per_hour || 100);

    // Get last claim time
    const { data: lastClaim } = await supabase
      .from("claim_history")
      .select("claimed_at")
      .eq("user_id", profile.user_id)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate hours since last claim
    const now = new Date();
    const lastClaimTime = lastClaim?.claimed_at ? new Date(lastClaim.claimed_at) : new Date(0);
    const hoursElapsed = (now.getTime() - lastClaimTime.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed < 0.01) {
      return json({ 
        error: "Must wait at least 36 seconds between claims",
        hours_elapsed: hoursElapsed,
      }, 429);
    }

    // Get user's slotted units with stats
    const { data: slots } = await supabase
      .from("garage_slots")
      .select(`
        player_units!inner (
          id,
          level,
          hp_base,
          grip_pct
        )
      `)
      .eq("owner", profile.user_id);

    // Get level multipliers
    const { data: multipliers } = await supabase
      .from("car_level_multipliers")
      .select("level, mult");

    const multMap = new Map(multipliers?.map(m => [m.level, m.mult]) || []);

    // Calculate user MP
    let userMP = 0;
    for (const slot of slots || []) {
      const unit = slot.player_units;
      if (unit && unit.hp_base) {
        const mult = multMap.get(unit.level) || 1.0;
        const hp = unit.hp_base * mult;
        const mp = hp * (1 + (unit.grip_pct || 0) / 100);
        userMP += mp;
      }
    }

    if (userMP === 0) {
      return json({ 
        error: "No motor power: please add cars to garage slots",
        user_mp: 0,
      }, 400);
    }

    // Get network MP from view
    const { data: networkData, error: networkError } = await supabase
      .from("v_network_motor_power")
      .select("network_mp")
      .single();

    if (networkError) {
      console.error("Failed to get network MP:", networkError);
      return json({ error: "Failed to get network motor power" }, 500);
    }

    const networkMP = Math.max(parseFloat(networkData.network_mp || 1), 1); // Avoid division by zero
    const networkSharePct = (userMP / networkMP) * 100;

    // Calculate claimable amount
    const claimableAmount = (userMP / networkMP) * emissionPerHour * hoursElapsed;

    if (claimableAmount <= 0) {
      return json({ 
        error: "No rewards to claim",
        claimable: 0,
      }, 400);
    }

    // Credit user balance
    const { data: currentBalance } = await supabase
      .from("inventory_currency")
      .select("war_bonds")
      .eq("owner", profile.user_id)
      .maybeSingle();

    const newBalance = (currentBalance?.war_bonds || 0) + claimableAmount;

    const { error: updateError } = await supabase
      .from("inventory_currency")
      .upsert({
        owner: profile.user_id,
        war_bonds: newBalance,
        updated_at: now.toISOString(),
      });

    if (updateError) {
      console.error("Failed to update balance:", updateError);
      return json({ error: "Failed to update balance" }, 500);
    }

    // Insert claim history
    const { data: claimRecord, error: claimError } = await supabase
      .from("claim_history")
      .insert({
        user_id: profile.user_id,
        amount_claimed: claimableAmount,
        motor_power_at_claim: userMP,
        network_share_pct: networkSharePct,
        hours_since_last_claim: hoursElapsed,
        claimed_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (claimError || !claimRecord) {
      console.error("Failed to insert claim history:", claimError);
      // Balance is already updated, continue with warning
    }

    // Process referral payouts
    const referralPayouts = [];

    // Level 1 referrer (2.5%)
    if (profile.referrer_wallet) {
      const level1Amount = claimableAmount * 0.025;

      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("wallet_address", profile.referrer_wallet)
        .maybeSingle();

      if (referrer) {
        // Credit level 1 referrer
        const { error: ref1Error } = await supabase
          .from("inventory_currency")
          .upsert({
            owner: referrer.user_id,
            war_bonds: supabase.rpc('increment_balance', { 
              user_id: referrer.user_id, 
              amount: level1Amount 
            }),
          }, {
            onConflict: 'owner',
            ignoreDuplicates: false,
          });

        // Record referral earning
        await supabase
          .from("referral_earnings")
          .insert({
            referrer_wallet: profile.referrer_wallet,
            referred_wallet: wallet,
            generation: 1,
            percentage: 2.5,
            amount_earned: level1Amount,
            from_claim_id: claimRecord?.id,
            earned_at: now.toISOString(),
          });

        referralPayouts.push({
          generation: 1,
          wallet: profile.referrer_wallet,
          amount: level1Amount,
        });

        // Level 2 referrer (1.25%)
        const { data: level1Referrer } = await supabase
          .from("profiles")
          .select("referrer_wallet")
          .eq("wallet_address", profile.referrer_wallet)
          .maybeSingle();

        if (level1Referrer?.referrer_wallet) {
          const level2Amount = claimableAmount * 0.0125;

          const { data: level2Profile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("wallet_address", level1Referrer.referrer_wallet)
            .maybeSingle();

          if (level2Profile) {
            // Credit level 2 referrer
            await supabase
              .from("inventory_currency")
              .upsert({
                owner: level2Profile.user_id,
                war_bonds: supabase.rpc('increment_balance', { 
                  user_id: level2Profile.user_id, 
                  amount: level2Amount 
                }),
              }, {
                onConflict: 'owner',
                ignoreDuplicates: false,
              });

            // Record referral earning
            await supabase
              .from("referral_earnings")
              .insert({
                referrer_wallet: level1Referrer.referrer_wallet,
                referred_wallet: wallet,
                generation: 2,
                percentage: 1.25,
                amount_earned: level2Amount,
                from_claim_id: claimRecord?.id,
                earned_at: now.toISOString(),
              });

            referralPayouts.push({
              generation: 2,
              wallet: level1Referrer.referrer_wallet,
              amount: level2Amount,
            });
          }
        }
      }
    }

    return json({
      ok: true,
      claimed_amount: Math.round(claimableAmount * 100) / 100,
      new_balance: Math.round(newBalance * 100) / 100,
      network_share_pct: Math.round(networkSharePct * 1000) / 1000,
      hours_elapsed: Math.round(hoursElapsed * 100) / 100,
      user_mp: Math.round(userMP * 100) / 100,
      network_mp: Math.round(networkMP * 100) / 100,
      referral_payouts: referralPayouts.map(p => ({
        generation: p.generation,
        wallet: p.wallet,
        amount: Math.round(p.amount * 100) / 100,
      })),
    }, 200);

  } catch (error) {
    console.error("claim-rewards error:", error);
    return json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/**
 * me edge function
 * GET /me?wallet=<address>
 * 
 * Returns complete player snapshot:
 * - Profile details
 * - Balances ($OIL/Bonds)
 * - Current garage slots with units
 * - Computed HP and MP totals
 * - Capacity and limits from garage_levels
 */

import { svc, CORS, json, method } from "../_shared/db.ts";

Deno.serve(async (req: Request) => {
  const preflight = method(req, "GET");
  if (preflight) return preflight;

  try {
    const url = new URL(req.url);
    const wallet = url.searchParams.get("wallet");

    if (!wallet) {
      return json({ error: "wallet required" }, 400);
    }

    const supabase = svc();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, wallet_address, garage_level, referrer_wallet, created_at")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (profileError) {
      return json({ error: "Profile query failed", details: profileError.message }, 500);
    }

    if (!profile) {
      return json({ error: "Profile not found" }, 404);
    }

    // Get balances
    const { data: balance } = await supabase
      .from("inventory_currency")
      .select("war_bonds")
      .eq("owner", profile.user_id)
      .maybeSingle();

    // Get garage level config
    const { data: garageConfig } = await supabase
      .from("garage_levels")
      .select("capacity, daily_pack_limit, upgrade_cost_oil")
      .eq("level", profile.garage_level)
      .single();

    // Get current garage slots with unit details
    const { data: slots } = await supabase
      .from("garage_slots")
      .select(`
        slot_position,
        unit_id,
        player_units!inner (
          id,
          name,
          tier_key,
          level,
          hp_base,
          grip_pct,
          fuel,
          unit_type,
          acquired_at
        )
      `)
      .eq("owner", profile.user_id)
      .order("slot_position");

    // Get level multipliers for MP calculation
    const { data: multipliers } = await supabase
      .from("car_level_multipliers")
      .select("level, mult");

    const multMap = new Map(multipliers?.map(m => [m.level, m.mult]) || []);

    // Compute total HP and MP
    let totalHP = 0;
    let totalMP = 0;

    for (const slot of slots || []) {
      const unit = slot.player_units;
      if (unit && unit.hp_base) {
        const mult = multMap.get(unit.level) || 1.0;
        const hp = unit.hp_base * mult;
        const mp = hp * (1 + (unit.grip_pct || 0) / 100);
        
        totalHP += hp;
        totalMP += mp;
      }
    }

    // Get total units owned
    const { count: totalUnits } = await supabase
      .from("player_units")
      .select("*", { count: "exact", head: true })
      .eq("owner", profile.user_id);

    // Get packs opened today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: packsToday } = await supabase
      .from("pack_openings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.user_id)
      .gte("opened_at", today.toISOString());

    return json({
      ok: true,
      profile: {
        user_id: profile.user_id,
        wallet: profile.wallet_address,
        garage_level: profile.garage_level,
        referrer_wallet: profile.referrer_wallet,
        created_at: profile.created_at,
      },
      balances: {
        oil: balance?.war_bonds || 0,
        bonds: balance?.war_bonds || 0, // Using same field for now
      },
      garage: {
        level: profile.garage_level,
        capacity: garageConfig?.capacity || 4,
        slots_used: slots?.length || 0,
        daily_pack_limit: garageConfig?.daily_pack_limit || 10,
        packs_opened_today: packsToday || 0,
        upgrade_cost: garageConfig?.upgrade_cost_oil || 0,
        slots: slots?.map(s => ({
          position: s.slot_position,
          unit: s.player_units,
        })) || [],
      },
      stats: {
        total_hp: Math.round(totalHP * 100) / 100,
        total_mp: Math.round(totalMP * 100) / 100,
        total_units: totalUnits || 0,
      },
    }, 200);

  } catch (error) {
    console.error("me error:", error);
    return json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});


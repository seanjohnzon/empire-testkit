/**
 * init-player edge function
 * POST /init-player
 * 
 * Initializes a new player with treasury payment verification
 * - Verifies 0.5 SOL payment to treasury
 * - Creates profile (idempotent)
 * - Grants 3 Common (beater) starter cars
 * - Attaches referrer if provided
 */

import { svc, CORS, json, method } from "../_shared/db.ts";
import { verifyTreasurySignature } from "../_shared/solana.ts";

Deno.serve(async (req: Request) => {
  const preflight = method(req, "POST");
  if (preflight) return preflight;

  try {
    const body = await req.json();
    const { wallet, referralCode, cluster, treasurySig } = body;

    if (!wallet) {
      return json({ error: "wallet required" }, 400);
    }

    if (!treasurySig) {
      return json({ error: "treasurySig required (proof of 0.5 SOL payment)" }, 400);
    }

    const targetCluster = cluster || Deno.env.get('SOL_CLUSTER') || 'devnet';

    // Verify treasury signature (0.5 SOL payment)
    const verification = await verifyTreasurySignature({
      wallet,
      treasurySig,
      cluster: targetCluster as 'mainnet' | 'devnet',
      expectedAmount: 0.5,
      maxAgeMinutes: 15,
    });

    if (!verification.valid) {
      return json({ 
        error: "Invalid treasury signature", 
        details: verification.error 
      }, 403);
    }

    const supabase = svc();

    // Check if profile already exists (idempotent)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id, wallet_address, garage_level, created_at")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (existingProfile) {
      // Profile exists - return existing data (idempotent)
      const { data: units } = await supabase
        .from("player_units")
        .select("id, name, tier_key, level, hp_base, grip_pct, fuel")
        .eq("wallet", wallet);

      return json({
        ok: true,
        existing: true,
        profile: existingProfile,
        units: units || [],
        txId: verification.txId,
      }, 200);
    }

    // Create new profile
    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        wallet_address: wallet,
        garage_level: 1,
        referrer_wallet: referralCode || null,
      })
      .select("user_id, wallet_address, garage_level, created_at")
      .single();

    if (profileError || !newProfile) {
      console.error("Profile creation failed:", profileError);
      return json({ error: "Failed to create profile", details: profileError?.message }, 500);
    }

    // Create inventory_currency record
    await supabase
      .from("inventory_currency")
      .insert({
        owner: newProfile.user_id,
        war_bonds: 0,
      });

    // Get beater cars from catalog
    const { data: beaterCars, error: catalogError } = await supabase
      .from("car_catalog")
      .select("car_key, tier_key, display_name")
      .eq("tier_key", "beater")
      .limit(3);

    if (catalogError || !beaterCars || beaterCars.length === 0) {
      console.error("Failed to fetch beater cars:", catalogError);
      return json({ error: "Failed to fetch starter cars" }, 500);
    }

    // Get tier stats for beater
    const { data: tierStats } = await supabase
      .from("car_tiers")
      .select("hp_base, fuel, grip_pct")
      .eq("tier_key", "beater")
      .single();

    if (!tierStats) {
      return json({ error: "Beater tier not found" }, 500);
    }

    // Create 3 starter units (round-robin if >3 models available)
    const starterUnits = [];
    for (let i = 0; i < 3; i++) {
      const car = beaterCars[i % beaterCars.length];
      starterUnits.push({
        owner: newProfile.user_id,
        wallet,
        name: car.display_name,
        tier_key: car.tier_key,
        level: 1,
        hp_base: tierStats.hp_base,
        grip_pct: tierStats.grip_pct,
        fuel: tierStats.fuel,
        unit_type: 'car',
      });
    }

    const { data: createdUnits, error: unitsError } = await supabase
      .from("player_units")
      .insert(starterUnits)
      .select("id, name, tier_key, level, hp_base, grip_pct, fuel");

    if (unitsError) {
      console.error("Failed to create starter units:", unitsError);
      return json({ error: "Failed to create starter units" }, 500);
    }

    return json({
      ok: true,
      existing: false,
      profile: newProfile,
      units: createdUnits || [],
      txId: verification.txId,
      message: "Player initialized successfully with 3 starter cars",
    }, 201);

  } catch (error) {
    console.error("init-player error:", error);
    return json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});


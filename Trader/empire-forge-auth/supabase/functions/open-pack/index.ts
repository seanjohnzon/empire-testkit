/**
 * open-pack edge function
 * POST /open-pack
 * 
 * Opens pack(s) and grants random cars based on pack_odds
 * - Checks daily pack limit from garage_levels
 * - Deducts Bonds/$OIL
 * - Rolls tier by pack_odds
 * - Picks random car from car_catalog by tier
 * - Creates player_units
 * - Inserts pack_openings audit record
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json, getActiveSeason } from "../_shared/db.ts";

serve(async (req) => {
  const guard = method(req, "POST"); 
  if (guard) return guard;
  
  const { wallet, packType, qty = 1 } = await req.json().catch(() => ({}));
  if (!wallet || !packType) {
    return json({ ok: false, error: "wallet and packType required" }, 400);
  }
  
  const supabase = svc();
  
  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, wallet_address, garage_level, referrer_wallet")
    .eq("wallet_address", wallet)
    .maybeSingle();
    
  if (!profile) {
    return json({ ok: false, error: "profile not found" }, 404);
  }
  
  // Get garage level config
  const { data: garageConfig } = await supabase
    .from("garage_levels")
    .select("daily_pack_limit")
    .eq("level", profile.garage_level)
    .single();
    
  const dailyLimit = garageConfig?.daily_pack_limit || 10;
  
  // Check daily pack limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: packsToday } = await supabase
    .from("pack_openings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.user_id)
    .gte("opened_at", today.toISOString());
    
  if ((packsToday || 0) + qty > dailyLimit) {
    return json({ 
      ok: false, 
      error: "daily_pack_limit_exceeded",
      limit: dailyLimit,
      used: packsToday || 0,
      requested: qty,
    }, 429);
  }
  
  // Get pack type
  const { data: pack } = await supabase
    .from("pack_types")
    .select("pack_type, display_name, cost_bonds")
    .eq("pack_type", packType)
    .maybeSingle();
    
  if (!pack) {
    return json({ ok: false, error: "unknown pack type" }, 404);
  }
  
  const totalCost = Number(pack.cost_bonds || 0) * Number(qty);
  
  if (totalCost > 0) {
    // Check balance
    const { data: inv } = await supabase
      .from("inventory_currency")
      .select("war_bonds")
      .eq("owner", profile.user_id)
      .maybeSingle();
      
    const balance = Number(inv?.war_bonds || 0);
    
    if (balance < totalCost) {
      return json({ 
        ok: false, 
        error: "insufficient_bonds",
        need: totalCost,
        have: balance,
      }, 400);
    }
    
    // Deduct cost
    await supabase
      .from("inventory_currency")
      .update({ 
        war_bonds: balance - totalCost,
        updated_at: new Date().toISOString(),
      })
      .eq("owner", profile.user_id);
  }
  
  // Get pack odds
  const { data: odds } = await supabase
    .from("pack_odds")
    .select("tier_key, odds_pct")
    .eq("pack_type", packType)
    .order("odds_pct", { ascending: false });
    
  if (!odds || odds.length === 0) {
    return json({ ok: false, error: "no odds configured for this pack" }, 500);
  }
  
  // Grant units
  const grantedUnits = [];
  const now = new Date().toISOString();
  
  for (let i = 0; i < qty; i++) {
    // Roll tier
    const roll = Math.random() * 100;
    let cumulative = 0;
    let selectedTier = odds[0].tier_key; // fallback
    
    for (const odd of odds) {
      cumulative += Number(odd.odds_pct);
      if (roll <= cumulative) {
        selectedTier = odd.tier_key;
        break;
      }
    }
    
    // Get car tier stats
    const { data: tierStats } = await supabase
      .from("car_tiers")
      .select("hp_base, fuel, grip_pct")
      .eq("tier_key", selectedTier)
      .single();
      
    if (!tierStats) {
      console.error(`Tier ${selectedTier} not found`);
      continue;
    }
    
    // Pick random car from catalog
    const { data: cars } = await supabase
      .from("car_catalog")
      .select("car_key, display_name, tier_key")
      .eq("tier_key", selectedTier);
      
    if (!cars || cars.length === 0) {
      console.error(`No cars found for tier ${selectedTier}`);
      continue;
    }
    
    const randomCar = cars[Math.floor(Math.random() * cars.length)];
    
    // Create unit
    const { data: newUnit, error: insertError } = await supabase
      .from("player_units")
      .insert({
        owner: profile.user_id,
        wallet: profile.wallet_address,
        name: randomCar.display_name,
        tier_key: selectedTier,
        level: 1,
        hp_base: tierStats.hp_base,
        grip_pct: tierStats.grip_pct,
        fuel: tierStats.fuel,
        unit_type: 'car',
      })
      .select("id, name, tier_key, level, hp_base, grip_pct, fuel")
      .single();
      
    if (!insertError && newUnit) {
      grantedUnits.push(newUnit);
      
      // Insert pack opening audit
      await supabase
        .from("pack_openings")
        .insert({
          user_id: profile.user_id,
          pack_type: packType,
          cost_bonds: pack.cost_bonds,
          reward_unit_id: newUnit.id,
          opened_at: now,
        });
    }
  }
  
  // Get updated balance
  const { data: newInv } = await supabase
    .from("inventory_currency")
    .select("war_bonds")
    .eq("owner", profile.user_id)
    .maybeSingle();
  
  return json({ 
    ok: true, 
    spent: totalCost,
    new_balance: Number(newInv?.war_bonds || 0),
    granted: grantedUnits.length,
    units: grantedUnits,
    daily_limit: {
      limit: dailyLimit,
      used: (packsToday || 0) + qty,
      remaining: dailyLimit - ((packsToday || 0) + qty),
    },
  }, 201);
});

/**
 * train-unit edge function
 * POST /train-unit
 * 
 * Trains a car to increase its level (max level 3)
 * - Validates ownership
 * - Enforces level cap (≤ 3)
 * - Cost: 50 $OIL per level
 * - Applies level multiplier and grip increase
 * - Returns updated unit and balance
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json } from "../_shared/db.ts";

serve(async (req) => {
  const guard = method(req, "POST"); 
  if (guard) return guard;
  
  const { wallet, unitId, levels = 1 } = await req.json().catch(() => ({}));
  if (!wallet || !unitId) {
    return json({ ok: false, error: "wallet and unitId required" }, 400);
  }
  
  const supabase = svc();
  
  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("wallet_address", wallet)
    .maybeSingle();
    
  if (!profile) {
    return json({ ok: false, error: "profile not found" }, 404);
  }

  // Get unit
  const { data: unit } = await supabase
    .from("player_units")
    .select("*")
    .eq("id", unitId)
    .eq("owner", profile.user_id)
    .maybeSingle();
    
  if (!unit) {
    return json({ ok: false, error: "unit not found or not owned" }, 404);
  }

  const currentLevel = Number(unit.level || 1);
  const requestedLevels = Number(levels || 1);
  const targetLevel = currentLevel + requestedLevels;
  
  // Validate level cap (max level 3)
  if (targetLevel > 3) {
    return json({ 
      ok: false, 
      error: "max_level_reached", 
      current_level: currentLevel, 
      max_level: 3,
      message: "Training only upgrades level (1→3). Cannot exceed level 3." 
    }, 400);
  }

  // Calculate cost: 50 $OIL per level
  const costPerLevel = 50;
  const totalCost = costPerLevel * requestedLevels;
  
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
      error: "insufficient_oil",
      need: totalCost,
      have: balance,
    }, 400);
  }
  
  // Deduct cost
  const newBalance = balance - totalCost;
  
  await supabase
    .from("inventory_currency")
    .update({ 
      war_bonds: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("owner", profile.user_id);

  // Get level multiplier
  const { data: multiplier } = await supabase
    .from("car_level_multipliers")
    .select("mult")
    .eq("level", targetLevel)
    .maybeSingle();
    
  const levelMult = multiplier?.mult || 1.0;
  
  // Apply training: keep base stats, update level
  // (multiplier is applied in calculations, not stored)
  // Grip increases slightly with level (design choice)
  const gripIncrease = (targetLevel - currentLevel) * 2; // +2% per level
  const newGrip = Number(unit.grip_pct || 0) + gripIncrease;

  // Update unit
  const { data: updatedUnit, error: updateError } = await supabase
    .from("player_units")
    .update({
      level: targetLevel,
      grip_pct: newGrip,
    })
    .eq("id", unitId)
    .select("id, name, tier_key, level, hp_base, grip_pct, fuel")
    .single();

  if (updateError) {
    console.error("Failed to update unit:", updateError);
    // Try to refund
    await supabase
      .from("inventory_currency")
      .update({ war_bonds: balance })
      .eq("owner", profile.user_id);
    return json({ ok: false, error: "Failed to train unit" }, 500);
  }

  return json({ 
    ok: true,
    unit: updatedUnit,
    cost: totalCost,
    new_balance: newBalance,
    from_level: currentLevel,
    to_level: targetLevel,
    level_multiplier: levelMult,
  }, 200);
});

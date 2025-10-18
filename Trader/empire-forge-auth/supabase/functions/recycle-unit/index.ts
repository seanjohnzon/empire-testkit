/**
 * recycle-unit edge function
 * POST /recycle-unit
 * 
 * Recycles a car with 20% chance to promote to next tier
 * - 20% promote: HP×1.5, Grip×1.3, reset to level 1
 * - 80% burn: delete unit and remove from garage_slots
 * - Cannot recycle godspeed tier (already max)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json } from "../_shared/db.ts";

// Tier progression
const TIER_ORDER = ['beater', 'street', 'sport', 'supercar', 'hypercar', 'prototype', 'godspeed'];

function getNextTier(currentTier: string): string | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

serve(async (req) => {
  const guard = method(req, "POST"); 
  if (guard) return guard;
  
  const { wallet, unitId } = await req.json().catch(() => ({}));
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

  const currentTier = unit.tier_key || 'beater';
  
  // Check if already at max tier
  const nextTier = getNextTier(currentTier);
  if (!nextTier) {
    return json({ 
      ok: false, 
      error: "max_tier_reached",
      tier: currentTier,
      message: "Cannot recycle godspeed tier (already maximum)" 
    }, 400);
  }

  // RNG: 20% promote, 80% burn
  const roll = Math.random();
  const success = roll < 0.20;

  if (success) {
    // PROMOTE: Upgrade to next tier at level 1
    // HP × 1.5, Grip × 1.3
    const newHP = Number(unit.hp_base || 0) * 1.5;
    const newGrip = Number(unit.grip_pct || 0) * 1.3;
    
    // Get new tier stats for fuel (keep original fuel from tier)
    const { data: tierStats } = await supabase
      .from("car_tiers")
      .select("fuel")
      .eq("tier_key", nextTier)
      .maybeSingle();
    
    // Update unit to new tier
    const { data: updatedUnit, error: updateError } = await supabase
      .from("player_units")
      .update({
        tier_key: nextTier,
        level: 1,
        hp_base: newHP,
        grip_pct: newGrip,
        fuel: tierStats?.fuel || unit.fuel,
      })
      .eq("id", unitId)
      .select("id, name, tier_key, level, hp_base, grip_pct, fuel")
      .single();

    if (updateError) {
      console.error("Failed to promote unit:", updateError);
      return json({ ok: false, error: "Failed to promote unit" }, 500);
    }

    return json({ 
      ok: true,
      result: "promoted",
      unit: updatedUnit,
      from_tier: currentTier,
      to_tier: nextTier,
      hp_multiplier: 1.5,
      grip_multiplier: 1.3,
    }, 200);

  } else {
    // BURN: Delete unit and remove from garage_slots
    
    // Remove from garage slots first (if slotted)
    await supabase
      .from("garage_slots")
      .delete()
      .eq("unit_id", unitId);
    
    // Delete unit
    const { error: deleteError } = await supabase
      .from("player_units")
      .delete()
      .eq("id", unitId);

    if (deleteError) {
      console.error("Failed to burn unit:", deleteError);
      return json({ ok: false, error: "Failed to burn unit" }, 500);
    }

    return json({ 
      ok: true,
      result: "burned",
      unit_id: unitId,
      tier: currentTier,
      message: "Unit recycled and destroyed (80% burn chance)"
    }, 200);
  }
});

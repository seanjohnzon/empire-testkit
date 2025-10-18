/**
 * update-garage-slots edge function
 * POST /update-garage-slots
 * 
 * Updates the player's active garage slots
 * - Validates unit ownership
 * - Enforces capacity from garage_levels
 * - Replaces all slots in transaction
 * - Returns updated slots and total MP
 */

import { svc, CORS, json, method } from "../_shared/db.ts";

Deno.serve(async (req: Request) => {
  const preflight = method(req, "POST");
  if (preflight) return preflight;

  try {
    const body = await req.json();
    const { wallet, unitIds } = body;

    if (!wallet) {
      return json({ error: "wallet required" }, 400);
    }

    if (!Array.isArray(unitIds)) {
      return json({ error: "unitIds must be an array" }, 400);
    }

    const supabase = svc();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, garage_level")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "Profile not found" }, 404);
    }

    // Get garage capacity
    const { data: garageConfig, error: configError } = await supabase
      .from("garage_levels")
      .select("capacity")
      .eq("level", profile.garage_level)
      .single();

    if (configError || !garageConfig) {
      return json({ error: "Garage config not found" }, 500);
    }

    // Validate capacity
    if (unitIds.length > garageConfig.capacity) {
      return json({ 
        error: `Garage capacity exceeded: ${unitIds.length} > ${garageConfig.capacity}` 
      }, 400);
    }

    // Validate ownership of all units
    if (unitIds.length > 0) {
      const { data: ownedUnits, error: unitsError } = await supabase
        .from("player_units")
        .select("id")
        .eq("owner", profile.user_id)
        .in("id", unitIds);

      if (unitsError) {
        return json({ error: "Failed to validate units", details: unitsError.message }, 500);
      }

      if (!ownedUnits || ownedUnits.length !== unitIds.length) {
        return json({ error: "Some units not found or not owned" }, 403);
      }
    }

    // Transaction: Delete all slots, then insert new ones
    const { error: deleteError } = await supabase
      .from("garage_slots")
      .delete()
      .eq("owner", profile.user_id);

    if (deleteError) {
      return json({ error: "Failed to clear slots", details: deleteError.message }, 500);
    }

    // Insert new slots
    if (unitIds.length > 0) {
      const newSlots = unitIds.map((unitId, index) => ({
        owner: profile.user_id,
        unit_id: unitId,
        slot_position: index + 1,
      }));

      const { error: insertError } = await supabase
        .from("garage_slots")
        .insert(newSlots);

      if (insertError) {
        return json({ error: "Failed to insert slots", details: insertError.message }, 500);
      }
    }

    // Get updated slots with unit details
    const { data: updatedSlots } = await supabase
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
          fuel
        )
      `)
      .eq("owner", profile.user_id)
      .order("slot_position");

    // Get level multipliers
    const { data: multipliers } = await supabase
      .from("car_level_multipliers")
      .select("level, mult");

    const multMap = new Map(multipliers?.map(m => [m.level, m.mult]) || []);

    // Calculate total MP
    let totalMP = 0;
    for (const slot of updatedSlots || []) {
      const unit = slot.player_units;
      if (unit && unit.hp_base) {
        const mult = multMap.get(unit.level) || 1.0;
        const hp = unit.hp_base * mult;
        const mp = hp * (1 + (unit.grip_pct || 0) / 100);
        totalMP += mp;
      }
    }

    return json({
      ok: true,
      slots: updatedSlots?.map(s => ({
        position: s.slot_position,
        unit: s.player_units,
      })) || [],
      total_mp: Math.round(totalMP * 100) / 100,
      capacity: garageConfig.capacity,
    }, 200);

  } catch (error) {
    console.error("update-garage-slots error:", error);
    return json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});


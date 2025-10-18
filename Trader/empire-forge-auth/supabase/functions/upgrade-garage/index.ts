/**
 * upgrade-garage edge function
 * POST /upgrade-garage
 * 
 * Upgrades the player's garage level
 * - Reads current level from profile
 * - Looks up next level config in garage_levels
 * - Enforces 24h cooldown via garage_upgrades
 * - Deducts upgrade_cost_oil
 * - Increments garage_level
 * - Inserts garage_upgrades audit record
 * - Returns new level, capacity, pack limit, and balances
 */

import { svc, CORS, json, method } from "../_shared/db.ts";

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
      .select("user_id, garage_level")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "Profile not found" }, 404);
    }

    const currentLevel = profile.garage_level;
    const nextLevel = currentLevel + 1;

    // Check if next level exists in garage_levels
    const { data: nextLevelConfig, error: configError } = await supabase
      .from("garage_levels")
      .select("capacity, daily_pack_limit, upgrade_cost_oil")
      .eq("level", nextLevel)
      .maybeSingle();

    if (configError || !nextLevelConfig) {
      return json({ 
        error: `Cannot upgrade: level ${nextLevel} not available`,
        current_level: currentLevel,
        max_level: currentLevel,
      }, 400);
    }

    const upgradeCost = parseFloat(nextLevelConfig.upgrade_cost_oil || 0);

    // Check 24h cooldown
    const { data: lastUpgrade } = await supabase
      .from("garage_upgrades")
      .select("upgraded_at")
      .eq("user_id", profile.user_id)
      .order("upgraded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastUpgrade) {
      const lastUpgradeTime = new Date(lastUpgrade.upgraded_at);
      const now = new Date();
      const hoursSinceUpgrade = (now.getTime() - lastUpgradeTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpgrade < 24) {
        const hoursRemaining = 24 - hoursSinceUpgrade;
        return json({
          error: "Upgrade cooldown active",
          hours_remaining: Math.round(hoursRemaining * 100) / 100,
          cooldown_hours: 24,
        }, 429);
      }
    }

    // Get current balance
    const { data: balance, error: balanceError } = await supabase
      .from("inventory_currency")
      .select("war_bonds")
      .eq("owner", profile.user_id)
      .maybeSingle();

    if (balanceError) {
      return json({ error: "Failed to get balance" }, 500);
    }

    const currentBalance = balance?.war_bonds || 0;

    if (currentBalance < upgradeCost) {
      return json({
        error: "Insufficient $OIL",
        required: upgradeCost,
        current: currentBalance,
        shortfall: upgradeCost - currentBalance,
      }, 400);
    }

    // Deduct cost
    const newBalance = currentBalance - upgradeCost;

    const { error: updateBalanceError } = await supabase
      .from("inventory_currency")
      .update({
        war_bonds: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("owner", profile.user_id);

    if (updateBalanceError) {
      console.error("Failed to deduct upgrade cost:", updateBalanceError);
      return json({ error: "Failed to deduct cost" }, 500);
    }

    // Increment garage level
    const { error: updateLevelError } = await supabase
      .from("profiles")
      .update({
        garage_level: nextLevel,
      })
      .eq("user_id", profile.user_id);

    if (updateLevelError) {
      console.error("Failed to update garage level:", updateLevelError);
      // Try to refund
      await supabase
        .from("inventory_currency")
        .update({ war_bonds: currentBalance })
        .eq("owner", profile.user_id);
      return json({ error: "Failed to upgrade garage" }, 500);
    }

    // Insert upgrade audit record
    await supabase
      .from("garage_upgrades")
      .insert({
        user_id: profile.user_id,
        from_level: currentLevel,
        to_level: nextLevel,
        cost_oil: upgradeCost,
        upgraded_at: new Date().toISOString(),
      });

    // Get next upgrade cost (if available)
    const { data: nextUpgradeConfig } = await supabase
      .from("garage_levels")
      .select("upgrade_cost_oil")
      .eq("level", nextLevel + 1)
      .maybeSingle();

    return json({
      ok: true,
      from_level: currentLevel,
      to_level: nextLevel,
      cost_oil: upgradeCost,
      new_balance: Math.round(newBalance * 100) / 100,
      garage: {
        level: nextLevel,
        capacity: nextLevelConfig.capacity,
        daily_pack_limit: nextLevelConfig.daily_pack_limit,
        next_upgrade_cost: nextUpgradeConfig?.upgrade_cost_oil || null,
      },
    }, 200);

  } catch (error) {
    console.error("upgrade-garage error:", error);
    return json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});


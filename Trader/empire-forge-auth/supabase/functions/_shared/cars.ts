/**
 * Cars Theme - Tier & Level System
 * 
 * 7 Tiers (beater → godspeed) × 3 Levels (L1, L2, L3)
 * Level multipliers: 1.00, 1.15, 1.30
 * 
 * Stats: hp_base, fuel, grip_pct
 * Derived: hp = hp_base * levelMult(level), mp = hp * (1 + grip_pct/100)
 */

export interface CarTier {
  tier_key: string;
  display: string;
  hp_base: number;
  fuel: number;
  grip_pct: number;
}

export interface CarStats {
  tier_key: string;
  level: number;
  hp_base: number;
  fuel: number;
  grip_pct: number;
  hp: number;      // hp_base * levelMult
  mp: number;      // hp * (1 + grip_pct/100)
}

// Canon tier data (matches DB migration)
export const CAR_TIERS: Record<string, CarTier> = {
  beater:    { tier_key: 'beater',    display: 'Beater',    hp_base: 4,    fuel: 2,   grip_pct: 2.0 },
  street:    { tier_key: 'street',    display: 'Street',    hp_base: 12,   fuel: 4,   grip_pct: 3.0 },
  sport:     { tier_key: 'sport',     display: 'Sport',     hp_base: 36,   fuel: 8,   grip_pct: 4.5 },
  supercar:  { tier_key: 'supercar',  display: 'Supercar',  hp_base: 108,  fuel: 16,  grip_pct: 6.75 },
  hypercar:  { tier_key: 'hypercar',  display: 'Hypercar',  hp_base: 324,  fuel: 32,  grip_pct: 10.125 },
  prototype: { tier_key: 'prototype', display: 'Prototype', hp_base: 972,  fuel: 64,  grip_pct: 15.1875 },
  godspeed:  { tier_key: 'godspeed',  display: 'Godspeed',  hp_base: 2916, fuel: 128, grip_pct: 22.78125 },
};

// Tier progression order (for recycle)
export const TIER_ORDER = ['beater', 'street', 'sport', 'supercar', 'hypercar', 'prototype', 'godspeed'];

// Level multipliers
export const LEVEL_MULTIPLIERS = {
  1: 1.00,
  2: 1.15,
  3: 1.30,
};

/**
 * Get next tier in progression (for recycle promote)
 */
export function getNextTier(currentTier: string): string | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

/**
 * Compute full car stats with derived values
 */
export function computeCarStats(tier_key: string, level: number): CarStats {
  const tier = CAR_TIERS[tier_key];
  if (!tier) {
    throw new Error(`Unknown tier: ${tier_key}`);
  }
  
  if (level < 1 || level > 3) {
    throw new Error(`Invalid level: ${level} (must be 1-3)`);
  }
  
  const levelMult = LEVEL_MULTIPLIERS[level as 1 | 2 | 3];
  const hp = tier.hp_base * levelMult;
  const mp = hp * (1 + tier.grip_pct / 100);
  
  return {
    tier_key: tier.tier_key,
    level,
    hp_base: tier.hp_base,
    fuel: tier.fuel,
    grip_pct: tier.grip_pct,
    hp: Math.round(hp * 1000) / 1000,      // round to 3 decimals
    mp: Math.round(mp * 1000) / 1000,
  };
}

/**
 * Fetch tier data from DB (with fallback to constants)
 */
export async function getCarTier(supabase: any, tier_key: string): Promise<CarTier> {
  const { data, error } = await supabase
    .from('car_tiers')
    .select('*')
    .eq('tier_key', tier_key)
    .maybeSingle();
  
  if (error || !data) {
    // Fallback to constants
    const tier = CAR_TIERS[tier_key];
    if (!tier) throw new Error(`Unknown tier: ${tier_key}`);
    return tier;
  }
  
  return {
    tier_key: data.tier_key,
    display: data.display,
    hp_base: Number(data.hp_base),
    fuel: Number(data.fuel),
    grip_pct: Number(data.grip_pct),
  };
}

/**
 * Map old unit_type to new tier_key (for backward compatibility)
 */
export function legacyUnitTypeToTier(unit_type: string): string {
  const mapping: Record<string, string> = {
    common: 'beater',
    uncommon: 'street',
    rare: 'sport',
    ultra_rare: 'supercar',
    epic: 'hypercar',
    legendary: 'prototype',
    mythic: 'godspeed',
  };
  return mapping[unit_type] || 'beater';
}

/**
 * Compute total MP for a player from their units
 */
export function computePlayerMP(units: Array<{ tier_key: string; level: number }>): number {
  return units.reduce((sum, unit) => {
    try {
      const stats = computeCarStats(unit.tier_key, unit.level);
      return sum + stats.mp;
    } catch {
      return sum; // skip invalid units
    }
  }, 0);
}

/**
 * Training cost curve: cost for upgrading from level N to N+1
 * Formula: 10 * targetLevel
 */
export function getTrainingCost(fromLevel: number, levelsToGain: number): number {
  let totalCost = 0;
  for (let i = 0; i < levelsToGain; i++) {
    const targetLevel = fromLevel + i + 1;
    if (targetLevel > 3) break; // can't exceed level 3
    totalCost += 10 * targetLevel;
  }
  return totalCost;
}



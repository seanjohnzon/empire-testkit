/**
 * Car Stats Calculator for Tests
 * 
 * Matches the canon stats from config/car_tiers.json and Edge Functions
 */

import carConfig from '../../config/car_tiers.json';

export interface CarTier {
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

const CAR_TIERS: Record<string, CarTier> = carConfig.tiers as any;
const LEVEL_MULTIPLIERS: Record<number, number> = carConfig.levelMultipliers as any;

/**
 * Compute full car stats with derived HP and MP
 * 
 * @param tierKey - One of: beater, street, sport, supercar, hypercar, prototype, godspeed
 * @param level - Level within tier (1, 2, or 3)
 * @returns Complete car stats with HP and MP calculations
 */
export function computeCarStats(tierKey: string, level: number): CarStats {
  const tier = CAR_TIERS[tierKey];
  if (!tier) {
    throw new Error(`Unknown tier: ${tierKey}. Valid tiers: ${Object.keys(CAR_TIERS).join(', ')}`);
  }
  
  if (level < 1 || level > 3) {
    throw new Error(`Invalid level: ${level}. Must be 1, 2, or 3.`);
  }
  
  const levelMult = LEVEL_MULTIPLIERS[level];
  if (!levelMult) {
    throw new Error(`No multiplier defined for level ${level}`);
  }
  
  // Derived stats
  const hp = tier.hp_base * levelMult;
  const mp = hp * (1 + tier.grip_pct / 100);
  
  return {
    tier_key: tierKey,
    level,
    hp_base: tier.hp_base,
    fuel: tier.fuel,
    grip_pct: tier.grip_pct,
    hp: Math.round(hp * 1000) / 1000,      // round to 3 decimals
    mp: Math.round(mp * 1000) / 1000,
  };
}

/**
 * Get the next tier in progression (for recycle tests)
 */
export function getNextTier(currentTier: string): string | null {
  const tierOrder = carConfig.tierOrder;
  const idx = tierOrder.indexOf(currentTier);
  if (idx === -1 || idx === tierOrder.length - 1) return null;
  return tierOrder[idx + 1];
}

/**
 * Calculate training cost for upgrading levels
 * Formula: sum of (10 * targetLevel) for each level gained
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

/**
 * Verify 80/10/10 split (for test assertions)
 */
export function verifySplit(total: number, split: { burn: number; ref: number; tre: number }) {
  const expectedBurn = total * 0.80;
  const expectedRef = total * 0.10;
  const expectedTre = total * 0.10;
  
  // Allow small rounding differences
  const tolerance = 0.000001;
  
  return {
    burnOk: Math.abs(split.burn - expectedBurn) < tolerance,
    refOk: Math.abs(split.ref - expectedRef) < tolerance,
    treOk: Math.abs(split.tre - expectedTre) < tolerance,
    totalOk: Math.abs((split.burn + split.ref + split.tre) - total) < tolerance,
  };
}

/**
 * Compute total MP for a collection of units
 */
export function computeTotalMP(units: Array<{ tier_key: string; level: number }>): number {
  return units.reduce((sum, unit) => {
    try {
      const stats = computeCarStats(unit.tier_key, unit.level);
      return sum + stats.mp;
    } catch {
      return sum; // skip invalid units
    }
  }, 0);
}

// Export config for reference in tests
export { carConfig };



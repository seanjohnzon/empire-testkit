/**
 * Car Tiers Configuration
 * 7 tiers × 3 levels
 */

export interface CarTier {
  key: string;
  display: string;
  hp_base: number;
  fuel: number;
  grip_pct: number;
  color: string; // Tailwind color class
}

export const CAR_TIERS: Record<string, CarTier> = {
  beater: {
    key: 'beater',
    display: 'Beater',
    hp_base: 4,
    fuel: 2,
    grip_pct: 2.0,
    color: 'gray',
  },
  street: {
    key: 'street',
    display: 'Street',
    hp_base: 12,
    fuel: 4,
    grip_pct: 3.0,
    color: 'green',
  },
  sport: {
    key: 'sport',
    display: 'Sport',
    hp_base: 36,
    fuel: 8,
    grip_pct: 4.5,
    color: 'blue',
  },
  supercar: {
    key: 'supercar',
    display: 'Supercar',
    hp_base: 108,
    fuel: 16,
    grip_pct: 6.75,
    color: 'purple',
  },
  hypercar: {
    key: 'hypercar',
    display: 'Hypercar',
    hp_base: 324,
    fuel: 32,
    grip_pct: 10.125,
    color: 'pink',
  },
  prototype: {
    key: 'prototype',
    display: 'Prototype',
    hp_base: 972,
    fuel: 64,
    grip_pct: 15.1875,
    color: 'orange',
  },
  godspeed: {
    key: 'godspeed',
    display: 'Godspeed',
    hp_base: 2916,
    fuel: 128,
    grip_pct: 22.78125,
    color: 'red',
  },
};

export const TIER_ORDER = ['beater', 'street', 'sport', 'supercar', 'hypercar', 'prototype', 'godspeed'];

export const LEVEL_MULTIPLIERS: Record<number, number> = {
  1: 1.00,
  2: 1.15,
  3: 1.30,
};

/**
 * Compute car stats with derived HP and MP
 */
export function computeCarStats(tierKey: string, level: number) {
  const tier = CAR_TIERS[tierKey];
  if (!tier) throw new Error(`Unknown tier: ${tierKey}`);
  
  const levelMult = LEVEL_MULTIPLIERS[level] || 1.0;
  const hp = tier.hp_base * levelMult;
  const mp = hp * (1 + tier.grip_pct / 100);
  
  return {
    ...tier,
    level,
    hp: Math.round(hp * 1000) / 1000,
    mp: Math.round(mp * 1000) / 1000,
  };
}

/**
 * Get next tier for recycle
 */
export function getNextTier(currentTier: string): string | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

/**
 * Calculate training cost
 */
export function getTrainingCost(fromLevel: number, levels: number): number {
  let total = 0;
  for (let i = 0; i < levels; i++) {
    const targetLevel = fromLevel + i + 1;
    if (targetLevel > 3) break;
    total += 10 * targetLevel;
  }
  return total;
}



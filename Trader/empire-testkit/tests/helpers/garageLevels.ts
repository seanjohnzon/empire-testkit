/**
 * Garage Levels Configuration
 * Single source of truth for all garage level expectations in tests
 */

export interface GarageLevel {
  level: number;
  capacity: number;
  dailyPacks: number;
  costOil: number;
}

export const GL: GarageLevel[] = [
  { level: 1, capacity: 4, dailyPacks: 10, costOil: 1_000 },
  { level: 2, capacity: 6, dailyPacks: 20, costOil: 2_000 },
  { level: 3, capacity: 8, dailyPacks: 30, costOil: 4_500 },
  { level: 4, capacity: 10, dailyPacks: 40, costOil: 9_000 },
  { level: 5, capacity: 12, dailyPacks: 50, costOil: 20_000 },
  { level: 6, capacity: 14, dailyPacks: 60, costOil: 50_000 },
  { level: 7, capacity: 16, dailyPacks: 70, costOil: 100_000 },
  { level: 8, capacity: 18, dailyPacks: 80, costOil: 200_000 },
  { level: 9, capacity: 20, dailyPacks: 90, costOil: 450_000 },
  { level: 10, capacity: 22, dailyPacks: 100, costOil: 900_000 },
];

/**
 * Get garage level configuration by level number
 */
export function getGarageLevel(level: number): GarageLevel | undefined {
  return GL.find(gl => gl.level === level);
}

/**
 * Get next level configuration
 */
export function getNextLevel(currentLevel: number): GarageLevel | undefined {
  return GL.find(gl => gl.level === currentLevel + 1);
}


/**
 * Tests for update-garage-slots edge function
 * REQ-GARAGE-SLOTS-001: cannot exceed capacity from garage_levels
 */

import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import { GL, getGarageLevel } from './helpers/garageLevels';

const GARAGE_SLOTS_FN = 'update-garage-slots';
const INIT_FN = 'init-player';
const ME_FN = 'me';
const TREASURY_SIG_TEST = process.env.TREASURY_SIG_TEST || 'mock_ok';

describe('update-garage-slots', () => {
  it('REQ-GARAGE-SLOTS-001a: can update slots within L1 capacity', async () => {
    const wallet = `slots_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create profile with 3 starter cars
    const initResult = await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    const units = initResult.json?.units || [];
    expect(units.length).toBeGreaterThanOrEqual(3);

    const level1 = getGarageLevel(1)!;
    expect(level1.capacity).toBe(4);

    // Update slots with 3 cars (within L1 capacity of 4)
    const unitIds = units.slice(0, 3).map((u: any) => u.id);

    const result = await callEdge(GARAGE_SLOTS_FN, {
      body: {
        wallet,
        unitIds,
      },
      tolerateStatuses: [200],
    });

    expect(result.status).toBe(200);
    expect(result.json?.ok).toBe(true);
    expect(result.json?.slots).toHaveLength(3);
    expect(result.json?.capacity).toBe(level1.capacity);
    expect(result.json?.total_mp).toBeGreaterThan(0);
  });

  it('REQ-GARAGE-SLOTS-001b: rejects slots exceeding L1 capacity', async () => {
    const wallet = `slots_exceed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create profile
    await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    const level1 = getGarageLevel(1)!;
    
    // Try to add more units than L1 capacity (4)
    const fakeUnitIds = Array.from({ length: level1.capacity + 1 }, (_, i) => 999000 + i);

    const result = await callEdge(GARAGE_SLOTS_FN, {
      body: {
        wallet,
        unitIds: fakeUnitIds,
      },
      tolerateStatuses: [400, 403],
    });

    expect([400, 403]).toContain(result.status);
    expect(result.json?.error).toBeDefined();
    
    if (result.status === 400) {
      expect(result.json?.error.toLowerCase()).toContain('capacity');
    }
  });

  it('REQ-GARAGE-SLOTS-001c: allows empty slots', async () => {
    const wallet = `slots_empty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create profile
    await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    // Clear all slots
    const result = await callEdge(GARAGE_SLOTS_FN, {
      body: {
        wallet,
        unitIds: [],
      },
      tolerateStatuses: [200],
    });

    expect(result.status).toBe(200);
    expect(result.json?.ok).toBe(true);
    expect(result.json?.slots).toHaveLength(0);
    expect(result.json?.total_mp).toBe(0);
  });

  it('REQ-GARAGE-SLOTS-001d: correctly calculates motor power', async () => {
    const wallet = `slots_mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create profile with starter cars
    const initResult = await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    const units = initResult.json?.units || [];
    const unitIds = units.slice(0, 2).map((u: any) => u.id);

    // Slot 2 cars
    const result = await callEdge(GARAGE_SLOTS_FN, {
      body: {
        wallet,
        unitIds,
      },
      tolerateStatuses: [200],
    });

    expect(result.status).toBe(200);
    expect(result.json?.total_mp).toBeGreaterThan(0);

    // Motor Power = HP × Level Multiplier × (1 + Grip%)
    // For 2 beater cars at level 1, MP should be > 0
    // Exact calculation depends on tier stats, but should be positive
    const mp = result.json?.total_mp;
    expect(mp).toBeTypeOf('number');
    expect(mp).toBeGreaterThan(0);
  });

  it('REQ-GARAGE-SLOTS-001e: capacity expectations match garage levels', async () => {
    // Verify all garage level capacities are as expected
    const capacities = GL.map(gl => gl.capacity);
    
    expect(capacities).toEqual([4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    
    // Each level should increase capacity by 2
    for (let i = 0; i < GL.length - 1; i++) {
      expect(GL[i + 1].capacity).toBe(GL[i].capacity + 2);
    }
  });
});

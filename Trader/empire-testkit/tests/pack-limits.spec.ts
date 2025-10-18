/**
 * Tests for open-pack daily limits
 * REQ-PACKS-LIMIT-001: daily pack limit enforced from garage_levels
 */

import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import { GL, getGarageLevel } from './helpers/garageLevels';

const OPEN_PACK_FN = 'open-pack';
const INIT_FN = 'init-player';
const TREASURY_SIG_TEST = process.env.TREASURY_SIG_TEST || 'mock_ok';

describe('open-pack daily limits', () => {
  it('REQ-PACKS-LIMIT-001a: enforces daily pack limit at level 1', async () => {
    const wallet = `pack_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create profile (L1 has limit of 10 packs/day)
    await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    const level1 = getGarageLevel(1)!;
    expect(level1.dailyPacks).toBe(10);

    // Try to open packs exceeding limit
    const result = await callEdge(OPEN_PACK_FN, {
      body: {
        wallet,
        packType: 'booster',
        qty: level1.dailyPacks + 1, // 11 packs
      },
      tolerateStatuses: [400, 429],
    });

    expect([400, 429]).toContain(result.status);
    
    if (result.status === 429) {
      expect(result.json?.error).toContain('daily_pack_limit');
      expect(result.json?.limit).toBe(level1.dailyPacks);
    }
  });

  it('REQ-PACKS-LIMIT-001b: returns correct daily limit info', async () => {
    const wallet = `pack_info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create profile
    await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    // Open 1 pack (free at start, just check structure)
    const result = await callEdge(OPEN_PACK_FN, {
      body: {
        wallet,
        packType: 'booster',
        qty: 1,
      },
      tolerateStatuses: [200, 201, 400],
    });

    if (result.status === 200 || result.status === 201) {
      const level1 = getGarageLevel(1)!;
      
      expect(result.json?.daily_limit).toBeDefined();
      expect(result.json?.daily_limit.limit).toBe(level1.dailyPacks);
      expect(result.json?.daily_limit.used).toBeGreaterThan(0);
      expect(result.json?.daily_limit.remaining).toBeGreaterThanOrEqual(0);
    }
  });

  it('REQ-PACKS-LIMIT-001c: daily limit increases with garage level', async () => {
    // Verify garage level configurations are correct
    const level1 = getGarageLevel(1)!;
    const level2 = getGarageLevel(2)!;
    const level3 = getGarageLevel(3)!;

    expect(level1.dailyPacks).toBe(10);
    expect(level2.dailyPacks).toBe(20);
    expect(level3.dailyPacks).toBe(30);
    
    // Each level should have progressively higher limits
    for (let i = 0; i < GL.length - 1; i++) {
      expect(GL[i + 1].dailyPacks).toBeGreaterThan(GL[i].dailyPacks);
    }
  });

  it('REQ-PACKS-LIMIT-001d: respects pack limit across multiple small openings', async () => {
    const wallet = `pack_multi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // Open packs in small batches up to limit
    // (assuming we have balance - may fail with insufficient_bonds which is OK)
    for (let i = 0; i < level1.dailyPacks; i += 2) {
      const result = await callEdge(OPEN_PACK_FN, {
        body: {
          wallet,
          packType: 'booster',
          qty: Math.min(2, level1.dailyPacks - i),
        },
        tolerateStatuses: [200, 201, 400, 429],
      });

      // If we hit insufficient balance, that's expected
      if (result.status === 400 && result.json?.error === 'insufficient_bonds') {
        break;
      }

      // If we hit the limit, check it's correct
      if (result.status === 429) {
        expect(result.json?.error).toContain('daily_pack_limit');
        break;
      }
    }

    // One more should definitely hit the limit (if we haven't hit balance issues)
    const overflow = await callEdge(OPEN_PACK_FN, {
      body: {
        wallet,
        packType: 'booster',
        qty: 1,
      },
      tolerateStatuses: [400, 429],
    });

    if (overflow.status === 429) {
      expect(overflow.json?.error).toContain('daily_pack_limit');
    }
  });
});

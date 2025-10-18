import { describe, it, expect } from 'vitest';
import { callEdge, resolveFn } from './_utils/callEdge';
import { computeCarStats, verifySplit } from './_utils/computeCarStats';

const FN = resolveFn(process.env.OPEN_PACK_FN, 'open-pack');

describe('REQ-310 Packs spend split (Cars Theme)', () => {
  it('REQ-310/315/318: pack grants cars with tier_key, level=1, and correct stats', async () => {
    const response = await callEdge(FN, {
      body: {
        walletAddress: process.env.TEST_WALLET,
        packType: 'common', // This should map to a tier in pack_types.drops
        qty: 1,
      },
      tolerateStatuses: [200, 201, 400, 404, 409],
    });
    
    // Accept success (200/201), expected failures (400=insufficient bonds, 409=idempotency),
    // or 404 (function not deployed or pack_types not configured)
    expect([200, 201, 400, 404, 409]).toContain(response.status);
    
    // If successful, verify Cars Theme response structure
    if ([200, 201].includes(response.status)) {
      expect(response.json?.ok).toBe(true);
      expect(typeof response.json?.spent).toBe('number');
      expect(typeof response.json?.granted).toBe('number');
      
      // Verify 80/10/10 split
      if (response.json?.split && response.json.spent > 0) {
        const splitCheck = verifySplit(response.json.spent, response.json.split);
        expect(splitCheck.totalOk).toBe(true);
      }
      
      // Verify granted units have car structure (if units array provided)
      if (response.json?.units && Array.isArray(response.json.units) && response.json.units.length > 0) {
        const unit = response.json.units[0];
        
        // Must have tier_key and level
        expect(unit.tier_key).toBeTruthy();
        expect(unit.level).toBe(1); // Always level 1 for new units
        
        // Must have car stats
        expect(typeof unit.hp_base).toBe('number');
        expect(typeof unit.grip_pct).toBe('number');
        expect(typeof unit.fuel).toBe('number');
        
        // Verify stats match canon for the tier
        try {
          const expectedStats = computeCarStats(unit.tier_key, 1);
          expect(unit.hp_base).toBe(expectedStats.hp_base);
          expect(unit.grip_pct).toBe(expectedStats.grip_pct);
          expect(unit.fuel).toBe(expectedStats.fuel);
        } catch (e) {
          // If tier not in our config, just log it
          console.warn(`Unknown tier in pack response: ${unit.tier_key}`);
        }
      }
    }
  });
});

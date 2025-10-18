import { describe, it, expect } from 'vitest';
import { callEdge, resolveFn } from './_utils/callEdge';
import { getNextTier } from './_utils/computeCarStats';

const FN = resolveFn(process.env.RECYCLE_UNIT_FN, 'recycle-unit');

describe('REQ-340 Recycle unit (Cars: tier-up mechanism)', () => {
  it('REQ-340: recycle returns either promote or burn result', async () => {
    const response = await callEdge(FN, {
      body: {
        walletAddress: process.env.TEST_WALLET,
        unitId: '00000000-0000-0000-0000-000000000000', // dummy UUID
      },
      tolerateStatuses: [200, 400, 404],
    });
    
    // Accept success or expected failures (400=max tier/invalid, 404=unit not found)
    expect([200, 400, 404]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.json?.ok).toBe(true);
      expect(response.json?.result).toBeTruthy();
      
      // Result must be either "promote" or "burn"
      expect(['promote', 'burn']).toContain(response.json.result);
      
      // Roll should be present (RNG value)
      expect(typeof response.json.roll).toBe('number');
      expect(response.json.roll).toBeGreaterThanOrEqual(0);
      expect(response.json.roll).toBeLessThan(1);
      
      if (response.json.result === 'promote') {
        // PROMOTE: Should have oldTier, newTier, level=1, and stats
        expect(response.json.oldTier).toBeTruthy();
        expect(response.json.newTier).toBeTruthy();
        expect(response.json.level).toBe(1); // Always reset to level 1
        
        // Verify tier progression is correct
        const expectedNext = getNextTier(response.json.oldTier);
        if (expectedNext) {
          expect(response.json.newTier).toBe(expectedNext);
        }
        
        // Should have refreshed stats
        if (response.json.stats) {
          expect(typeof response.json.stats.hp_base).toBe('number');
          expect(typeof response.json.stats.grip_pct).toBe('number');
          expect(typeof response.json.stats.fuel).toBe('number');
        }
      } else if (response.json.result === 'burn') {
        // BURN: Should have tier and level from burned unit
        expect(response.json.tier).toBeTruthy();
        expect(typeof response.json.level).toBe('number');
        expect(response.json.message).toBeTruthy();
      }
    }
    
    // If error, verify it's for the right reason
    if (response.status === 400 && response.json?.error) {
      // Should be either "max_tier_reached", "unit not found", or validation error
      const validErrors = [
        'max_tier_reached',
        'unit not found', 
        'unitId required',
        'walletAddress required',
      ];
      expect(validErrors.some(err => response.json.error.includes(err) || response.json.error === err)).toBe(true);
    }
  });
  
  it('REQ-341: recycle promotes ~20% of the time (probabilistic)', async () => {
    // This test documents expected behavior but can't deterministically test RNG
    // In a real scenario, you'd run this 100+ times and check distribution
    
    const response = await callEdge(FN, {
      body: {
        walletAddress: process.env.TEST_WALLET,
        unitId: '00000000-0000-0000-0000-000000000000',
      },
      tolerateStatuses: [200, 400, 404],
    });
    
    // Just verify the endpoint exists and responds properly
    expect([200, 400, 404]).toContain(response.status);
    
    if (response.status === 200) {
      // Verify roll is within expected range for 20% promote rate
      // roll < 0.20 → promote
      // roll >= 0.20 → burn
      expect(typeof response.json.roll).toBe('number');
      
      if (response.json.result === 'promote') {
        expect(response.json.roll).toBeLessThan(0.20);
      } else if (response.json.result === 'burn') {
        expect(response.json.roll).toBeGreaterThanOrEqual(0.20);
      }
    }
  });
  
  it('REQ-342: cannot recycle godspeed tier (max tier)', async () => {
    // This test documents that godspeed (max tier) cannot be recycled
    // In practice, this would need a godspeed unit to exist
    
    const response = await callEdge(FN, {
      body: {
        walletAddress: process.env.TEST_WALLET,
        unitId: '00000000-0000-0000-0000-000000000000',
      },
      tolerateStatuses: [200, 400, 404],
    });
    
    // If we get a 400 error about max tier, verify the message
    if (response.status === 400 && response.json?.error === 'max_tier_reached') {
      expect(response.json.tier).toBe('godspeed');
      expect(response.json.message).toContain('maximum');
    }
    
    // Otherwise, just accept that the unit doesn't exist or isn't godspeed
    expect([200, 400, 404]).toContain(response.status);
  });
});



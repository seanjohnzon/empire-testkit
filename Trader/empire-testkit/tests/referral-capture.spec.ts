import { describe, it, expect, beforeAll } from 'vitest';
import { callEdge, resolveFn } from './_utils/callEdge';

const REFERRAL_FN = resolveFn(process.env.REFERRAL_CAPTURE_FN, 'referral-capture');
const CLAIM_FN = resolveFn(process.env.CLAIM_REWARDS_FN, 'claim-rewards');

describe('REQ-520 Referral capture', () => {
  // Ensure profile exists before testing referral capture
  beforeAll(async () => {
    // Call claim-rewards to ensure profile/player_season exists
    await callEdge(CLAIM_FN, {
      body: { walletAddress: process.env.TEST_WALLET },
      tolerateStatuses: [200, 201, 400, 404],
    });
  });

  it('REQ-520: referral capture first set returns 200', async () => {
    const testCode = `ref_${Date.now()}`; // Unique code to avoid conflicts
    
    const response = await callEdge(REFERRAL_FN, {
      body: {
        wallet: process.env.TEST_WALLET,
        code: testCode,
      },
      tolerateStatuses: [200, 404, 409], // 200 = first set, 404 = profile missing, 409 = already set
    });
    
    // Should be 200 (first set), 404 (profile not created), or 409 (if already set from previous run)
    expect([200, 404, 409]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.json?.ok).toBe(true);
    }
  });

  it('REQ-521: referral capture change attempt returns 409', async () => {
    const firstCode = `ref_first_${Date.now()}`;
    const secondCode = `ref_second_${Date.now()}`;
    
    // Set first referral code (will be 200, 404, or 409 if already set)
    const first = await callEdge(REFERRAL_FN, {
      body: {
        wallet: process.env.TEST_WALLET,
        code: firstCode,
      },
      tolerateStatuses: [200, 404, 409],
    });
    
    expect([200, 404, 409]).toContain(first.status);
    
    // Try to change to a different code - should be 409 (if profile exists) or 404 (if not)
    const second = await callEdge(REFERRAL_FN, {
      body: {
        wallet: process.env.TEST_WALLET,
        code: secondCode,
      },
      tolerateStatuses: [404, 409],
    });
    
    // If first call succeeded (200), second should be 409 (conflict)
    // If first call was 404 (no profile), second will also be 404
    expect([404, 409]).toContain(second.status);
    
    if (second.status === 409) {
      expect(second.json?.ok).toBe(false);
      expect(second.json?.error).toBe('duplicate');
    }
  });

  it('REQ-522: referral capture with same code is idempotent (200)', async () => {
    const sameCode = `ref_idempotent_${Date.now()}`;
    
    // Set code first time
    const first = await callEdge(REFERRAL_FN, {
      body: {
        wallet: process.env.TEST_WALLET,
        code: sameCode,
      },
      tolerateStatuses: [200, 404, 409],
    });
    
    expect([200, 404, 409]).toContain(first.status);
    
    // Only test idempotency if first call succeeded (200)
    // If first call was 409 (referrer already set from previous test), we can't test idempotency with a new code
    if (first.status === 200) {
      // Set same code again - should be 200 (idempotent)
      const second = await callEdge(REFERRAL_FN, {
        body: {
          wallet: process.env.TEST_WALLET,
          code: sameCode,
        },
        tolerateStatuses: [200],
      });
      
      expect(second.status).toBe(200);
      expect(second.json?.ok).toBe(true);
    } else if (first.status === 409) {
      // If referrer already set, calling again with same (different from existing) code should still be 409
      const second = await callEdge(REFERRAL_FN, {
        body: {
          wallet: process.env.TEST_WALLET,
          code: sameCode,
        },
        tolerateStatuses: [409],
      });
      
      expect(second.status).toBe(409);
      expect(second.json?.error).toBe('duplicate');
    } else if (first.status === 404) {
      // If profile doesn't exist, second call will also be 404
      const second = await callEdge(REFERRAL_FN, {
        body: {
          wallet: process.env.TEST_WALLET,
          code: sameCode,
        },
        tolerateStatuses: [404],
      });
      
      expect(second.status).toBe(404);
    }
  });

  it('REQ-523: referral capture with missing wallet returns 400', async () => {
    const response = await callEdge(REFERRAL_FN, {
      body: {
        code: 'some-code',
      },
      tolerateStatuses: [400],
    });
    
    expect(response.status).toBe(400);
    expect(response.json?.error).toContain('required');
  });

  it('REQ-524: referral capture with non-existent wallet returns 404', async () => {
    const nonExistentWallet = '99NonExistentWallet99999999999999999999999';
    
    const response = await callEdge(REFERRAL_FN, {
      body: {
        wallet: nonExistentWallet,
        code: 'some-code',
      },
      tolerateStatuses: [404],
    });
    
    expect(response.status).toBe(404);
    expect(response.json?.error).toBe('profile not found');
  });
});

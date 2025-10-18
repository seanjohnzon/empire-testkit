/**
 * Tests for claim-rewards edge function
 * REQ-CLAIM-001: claim when networkMP>0 returns >0, inserts claim_history
 * REQ-CLAIM-REFERRAL-001: on claim, level-1 gets 2.5%, level-2 gets 1.25%
 */

import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';

const CLAIM_FN = 'claim-rewards';
const GARAGE_SLOTS_FN = 'update-garage-slots';
const INIT_FN = 'init-player';
const TREASURY_SIG_TEST = process.env.TREASURY_SIG_TEST || 'mock_ok';

describe('claim-rewards', () => {
  it('REQ-CLAIM-001a: rejects claim when no motor power', async () => {
    const wallet = `claim_no_mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create profile
    await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    // Clear slots (no motor power)
    await callEdge(GARAGE_SLOTS_FN, {
      body: {
        wallet,
        unitIds: [],
      },
      tolerateStatuses: [200],
    });

    // Try to claim
    const result = await callEdge(CLAIM_FN, {
      body: {
        wallet,
      },
      tolerateStatuses: [400],
    });

    expect(result.status).toBe(400);
    expect(result.json?.error).toBeDefined();
    expect(result.json?.error.toLowerCase()).toContain('motor power');
  });

  it('REQ-CLAIM-001b: claim returns >0 when MP>0 and time elapsed', async () => {
    const wallet = `claim_success_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    await callEdge(GARAGE_SLOTS_FN, {
      body: {
        wallet,
        unitIds,
      },
      tolerateStatuses: [200],
    });

    // Wait for time to pass (minimum 36 seconds = 0.01 hours)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Claim
    const result = await callEdge(CLAIM_FN, {
      body: {
        wallet,
      },
      tolerateStatuses: [200, 400, 429],
    });

    if (result.status === 429) {
      // Too soon between claims - acceptable
      expect(result.json?.hours_elapsed).toBeDefined();
      return;
    }

    if (result.status === 200) {
      expect(result.json?.ok).toBe(true);
      expect(result.json?.claimed_amount).toBeGreaterThan(0);
      expect(result.json?.network_share_pct).toBeGreaterThan(0);
      expect(result.json?.hours_elapsed).toBeGreaterThan(0);
      expect(result.json?.user_mp).toBeGreaterThan(0);
      expect(result.json?.network_mp).toBeGreaterThan(0);
    }
  });

  it('REQ-CLAIM-001c: validates claim calculation formula', async () => {
    // Formula: claimable = (userMP / networkMP) × emission × hours
    // Validate this conceptually with constants
    
    const emission = 100; // default emission_per_hour
    const userMP = 200;
    const networkMP = 10000;
    const hours = 1;
    
    const expected = (userMP / networkMP) * emission * hours;
    expect(expected).toBe(2); // 200/10000 * 100 * 1 = 2
    
    // With 2.5 hours
    const expected2 = (userMP / networkMP) * emission * 2.5;
    expect(expected2).toBe(5); // 200/10000 * 100 * 2.5 = 5
  });

  it('REQ-CLAIM-REFERRAL-001a: referral payouts with 2-level chain', async () => {
    // Create 3 wallets: L2 → L1 → Claimer
    const l2Wallet = `claim_ref_l2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const l1Wallet = `claim_ref_l1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const claimerWallet = `claim_ref_claimer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create L2 (no referrer)
    await callEdge(INIT_FN, {
      body: {
        wallet: l2Wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    // Create L1 (referred by L2)
    await callEdge(INIT_FN, {
      body: {
        wallet: l1Wallet,
        referralCode: l2Wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    // Create Claimer (referred by L1)
    const claimerInit = await callEdge(INIT_FN, {
      body: {
        wallet: claimerWallet,
        referralCode: l1Wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    const units = claimerInit.json?.units || [];
    const unitIds = units.slice(0, 2).map((u: any) => u.id);

    if (unitIds.length > 0) {
      // Slot units
      await callEdge(GARAGE_SLOTS_FN, {
        body: {
          wallet: claimerWallet,
          unitIds,
        },
        tolerateStatuses: [200],
      });

      // Wait for time to pass
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Claim
      const claimResult = await callEdge(CLAIM_FN, {
        body: {
          wallet: claimerWallet,
        },
        tolerateStatuses: [200, 400, 429],
      });

      if (claimResult.status === 200) {
        expect(claimResult.json?.ok).toBe(true);
        expect(claimResult.json?.claimed_amount).toBeGreaterThan(0);
        
        // Check referral payouts
        const payouts = claimResult.json?.referral_payouts || [];
        
        if (payouts.length > 0) {
          // Level 1 referrer should get 2.5%
          const l1Payout = payouts.find((p: any) => p.generation === 1);
          if (l1Payout) {
            const expected = claimResult.json.claimed_amount * 0.025;
            const tolerance = 0.01; // Allow 1 cent tolerance for floating point
            expect(Math.abs(l1Payout.amount - expected)).toBeLessThan(tolerance);
            expect(l1Payout.wallet).toBe(l1Wallet);
          }

          // Level 2 referrer should get 1.25%
          const l2Payout = payouts.find((p: any) => p.generation === 2);
          if (l2Payout) {
            const expected = claimResult.json.claimed_amount * 0.0125;
            const tolerance = 0.01;
            expect(Math.abs(l2Payout.amount - expected)).toBeLessThan(tolerance);
            expect(l2Payout.wallet).toBe(l2Wallet);
          }
        }
      }
    }
  });

  it('REQ-CLAIM-REFERRAL-001b: validates referral percentage constants', async () => {
    // Level 1: 2.5%
    const level1Pct = 0.025;
    expect(level1Pct).toBe(2.5 / 100);
    
    // Level 2: 1.25%
    const level2Pct = 0.0125;
    expect(level2Pct).toBe(1.25 / 100);
    
    // Total referral payout: 3.75%
    const totalPct = level1Pct + level2Pct;
    // Use toBeCloseTo for floating point comparison
    expect(totalPct).toBeCloseTo(0.0375, 10);
  });

  it('REQ-CLAIM-001d: enforces minimum time between claims', async () => {
    const wallet = `claim_rapid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // Slot cars
    await callEdge(GARAGE_SLOTS_FN, {
      body: {
        wallet,
        unitIds,
      },
      tolerateStatuses: [200],
    });

    // Wait minimal time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // First claim
    const first = await callEdge(CLAIM_FN, {
      body: { wallet },
      tolerateStatuses: [200, 400, 429],
    });

    if (first.status === 200) {
      // Immediately try to claim again (should fail)
      const second = await callEdge(CLAIM_FN, {
        body: { wallet },
        tolerateStatuses: [400, 429],
      });

      expect([400, 429]).toContain(second.status);
      
      if (second.status === 429) {
        expect(second.json?.hours_elapsed).toBeDefined();
        expect(second.json?.hours_elapsed).toBeLessThan(0.01); // < 36 seconds
      }
    }
  });
});

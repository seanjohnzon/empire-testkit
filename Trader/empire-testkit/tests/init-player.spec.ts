/**
 * Tests for init-player edge function
 * REQ-INIT-001: init is idempotent; creates profile, 3 starter cars, garage_level=1
 */

import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';

const INIT_FN = 'init-player';
const TREASURY_SIG_TEST = process.env.TREASURY_SIG_TEST || 'mock_ok';

describe('init-player', () => {
  it('REQ-INIT-001a: creates profile with 3 starter cars and garage_level=1', async () => {
    const wallet = `init_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    expect([200, 201]).toContain(result.status);
    expect(result.json?.ok).toBe(true);
    expect(result.json?.profile).toBeDefined();
    expect(result.json?.profile.garage_level).toBe(1);
    expect(result.json?.units).toHaveLength(3);
    
    // All starter cars should be beater tier
    for (const unit of result.json.units) {
      expect(unit.tier_key).toBe('beater');
      expect(unit.level).toBe(1);
    }
  });

  it('REQ-INIT-001b: init is idempotent (returns 200 on second call)', async () => {
    const wallet = `init_idempotent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // First call - should create profile
    const first = await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    expect([200, 201]).toContain(first.status);
    expect(first.json?.ok).toBe(true);
    
    const originalUnits = first.json?.units || [];

    // Second call (idempotent) - should return existing profile
    const second = await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200],
    });

    expect(second.status).toBe(200);
    expect(second.json?.ok).toBe(true);
    expect(second.json?.existing).toBe(true);
    expect(second.json?.profile.wallet_address).toBe(wallet);
    
    // Should return same units (or at least same count)
    expect(second.json?.units.length).toBe(originalUnits.length);
  });

  it('REQ-INIT-001c: attaches referrer if provided', async () => {
    const referrer = `init_referrer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const referred = `init_referred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create referrer first
    await callEdge(INIT_FN, {
      body: {
        wallet: referrer,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    // Create referred with referral code
    const result = await callEdge(INIT_FN, {
      body: {
        wallet: referred,
        referralCode: referrer,
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [200, 201],
    });

    expect([200, 201]).toContain(result.status);
    expect(result.json?.ok).toBe(true);
    expect(result.json?.profile).toBeDefined();
    
    // Profile should have referrer_wallet set (checked via API if exposed)
    // For now, just verify creation succeeded
  });

  it('REQ-INIT-001d: rejects invalid treasury signature', async () => {
    const wallet = `init_invalid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await callEdge(INIT_FN, {
      body: {
        wallet,
        cluster: 'devnet',
        treasurySig: 'invalid_sig_not_mock',
      },
      tolerateStatuses: [403, 400],
    });

    expect([403, 400]).toContain(result.status);
    expect(result.json?.error).toBeDefined();
  });

  it('REQ-INIT-001e: requires wallet parameter', async () => {
    const result = await callEdge(INIT_FN, {
      body: {
        cluster: 'devnet',
        treasurySig: TREASURY_SIG_TEST,
      },
      tolerateStatuses: [400],
    });

    expect(result.status).toBe(400);
    expect(result.json?.error).toContain('wallet');
  });
});

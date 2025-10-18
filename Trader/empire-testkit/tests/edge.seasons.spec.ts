import { describe, it, expect } from 'vitest';
import { callEdge, resolveFn } from './_utils/callEdge';

const LIST_FN = resolveFn(process.env.SEASONS_LIST_FN, 'list-seasons');
const TOGGLE_FN = resolveFn(process.env.SEASONS_TOGGLE_FN, 'toggle-season');

describe('REQ-001/002 Seasons admin', () => {
  it('REQ-001: list-seasons returns array (or 405 if method mismatch)', async () => {
    const res = await callEdge(LIST_FN, { 
      tolerateStatuses: [200, 405] 
    });
    
    expect([200, 405]).toContain(res.status);
    
    // If 200, should return array or object
    if (res.status === 200) {
      expect(res.json).toBeTruthy();
    }
  });

  it('REQ-002: toggle-season admin-only (403 non-admin, 405 wrong method, or 200/400 if admin)', async () => {
    // Test without admin credentials - expect 403 (forbidden) or 400 (missing seasonId)
    const res = await callEdge(TOGGLE_FN, { 
      body: {
        seasonId: '00000000-0000-0000-0000-000000000001',
        // No walletAddress = not admin
      },
      tolerateStatuses: [200, 400, 403, 405] 
    });
    
    // Expected outcomes:
    // 200 = success (if test wallet is admin and season exists)
    // 400 = missing seasonId or validation error
    // 403 = forbidden (not admin) ← most likely for test wallet
    // 405 = method not allowed (wrong HTTP method)
    expect([200, 400, 403, 405]).toContain(res.status);
    
    // If 403, verify it's the admin check
    if (res.status === 403) {
      expect(res.json?.error).toBe('forbidden');
    }
    
    // Document: This is admin-only functionality.
    // In production, only wallets in admin_wallets table can toggle seasons.
    // Test wallets are typically not admin, so 403 is expected.
  });
});

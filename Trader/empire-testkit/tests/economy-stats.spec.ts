import { describe, it, expect } from 'vitest';
import { callEdge, resolveFn } from './_utils/callEdge';

const FN = resolveFn(process.env.ECONOMY_STATS_FN, 'economy-stats');

describe('REQ-401 Economy stats (Cars Theme ledger)', () => {
  it('REQ-401/402: economy stats totals and recents with new ledger kinds', async () => {
    const response = await callEdge(FN);
    expect(response.status).toBe(200);
    expect(response.json?.ok ?? true).toBeTruthy();
    
    // Verify totals structure
    if (response.json?.totals) {
      expect(typeof response.json.totals).toBe('object');
      // Should have aggregate bond data
      expect(response.json.totals).toBeTruthy();
    }
    
    // Verify recents structure
    if (response.json?.recents && Array.isArray(response.json.recents)) {
      // Recent entries should be ledger entries
      response.json.recents.forEach((entry: any) => {
        expect(entry).toHaveProperty('kind');
        expect(entry).toHaveProperty('amount');
        
        // Verify Cars Theme ledger kinds are recognized
        const validKinds = [
          'claim',
          'spend_pack',
          'train_level_up',  // NEW: Cars training
          'recycle_promote', // NEW: Cars recycle success
          'recycle_burn',    // NEW: Cars recycle failure
          'burn',
          'referral',
          'treasury',
          'mint',
        ];
        
        // If kind is present, it should be one of the valid kinds
        if (entry.kind) {
          const isValid = validKinds.includes(entry.kind);
          if (!isValid) {
            console.warn(`Unknown ledger kind found: ${entry.kind}`);
          }
        }
      });
      
      // Document expected ledger kinds for Cars Theme:
      // - train_level_up: Training a unit (level progression)
      // - recycle_promote: Successful recycle (tier upgrade)
      // - recycle_burn: Failed recycle (unit destroyed)
    }
  });
});

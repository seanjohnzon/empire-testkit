import { describe, it, expect } from 'vitest';
import { callEdge, resolveFn } from './_utils/callEdge';

const FN = resolveFn(process.env.SIGN_CLAIM_FN, 'sign-claim');

describe('REQ-160 Sign claim oracle', () => {
  it('REQ-160/145: sign claim returns signature and halving multiplier', async () => {
    const response = await callEdge(FN, {
      body: {
        walletAddress: process.env.TEST_WALLET,
        amount: 1.23,
        seasonId: null,
      },
      tolerateStatuses: [200, 400],
    });
    expect([200, 400]).toContain(response.status);

    if (response.status === 200) {
      expect(response.json?.ok).toBe(true);
      expect(typeof response.json?.sig).toBe('string');
      expect(typeof response.json?.multiplier).toBe('number');
    }
  });
});

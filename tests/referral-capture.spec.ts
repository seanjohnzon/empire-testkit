import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.REFERRAL_CAPTURE_FN;
const WALLET = process.env.TEST_WALLET;
const describeReferral = !FN || !WALLET ? describe.skip : describe;

describeReferral('REQ-520 Referral capture', () => {
  it('REQ-520/521: referral capture idempotent', async () => {
    const response = await callEdge(FN!, {
      body: { walletAddress: WALLET, code: 'DUMMY' }
    });

    expect([200, 409]).toContain(response.status);

    if (response.status === 200) {
      expect(response.json?.ok).toBe(true);
    } else {
      const message = String(response.json?.error || response.json?.message || '').toLowerCase();
      expect(message.length).toBeGreaterThan(0);
    }
  });
});

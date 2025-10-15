import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.SIGN_CLAIM_FN;
const WALLET = process.env.TEST_WALLET;
const SEASON = process.env.SEASON_PUBKEY || '11111111111111111111111111111111';
const describeSignClaim = !FN || !WALLET ? describe.skip : describe;

describeSignClaim('REQ-160 Sign claim oracle', () => {
  it('REQ-160/145: sign claim returns signature and halving multiplier', async () => {
    const response = await callEdge(FN!, {
      body: {
        season: SEASON,
        wallet: WALLET,
        now_unix: Math.floor(Date.now() / 1000),
        mp: 10,
        total_mp: 100
      }
    });

    expect(response.status).toBe(200);
    expect(response.json?.ok).toBe(true);
    expect(typeof response.json?.sig).toBe('string');
    expect(response.json.sig.length).toBeGreaterThan(0);
    expect(typeof response.json?.pubkey).toBe('string');
    expect(response.json.pubkey.length).toBeGreaterThan(0);
    expect(typeof response.json?.halving_multiplier_bps).toBe('number');
    expect(response.json.halving_multiplier_bps).toBeGreaterThanOrEqual(0);
    expect(response.json.halving_multiplier_bps).toBeLessThanOrEqual(10000);
  });
});

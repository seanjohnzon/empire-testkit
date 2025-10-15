import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const WALLET = process.env.TEST_WALLET!; // must exist in profiles.wallet_address

describe('REQ-105 Claim (DB mode) + REQ-124/242 Halving', () => {
  it('REQ-105A: 400 when walletAddress missing', async () => {
    const r = await callEdge('claim-rewards', { body: {} });
    expect(r.status).toBe(400);
    expect((r.json.error || '').toLowerCase()).toContain('walletaddress');
  });

  it('REQ-105B: 200 and returns breakdown for known wallet', async () => {
    const r = await callEdge('claim-rewards', { body: { walletAddress: WALLET } });
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
    expect(typeof r.json.amount).toBe('number');
    const b = r.json.breakdown;
    expect(b && typeof b.E_base === 'number').toBe(true);
    expect(b && typeof b.H === 'number').toBe(true);
    expect(b.H).toBeGreaterThanOrEqual(0);
    expect(b.H).toBeLessThanOrEqual(1);
    expect(b && typeof b.E_season === 'number').toBe(true);
    expect(b && typeof b.share === 'number').toBe(true);
  });

  it('REQ-201: cooldown immediate second call yields <= previous', async () => {
    const r1 = await callEdge('claim-rewards', { body: { walletAddress: WALLET } });
    const r2 = await callEdge('claim-rewards', { body: { walletAddress: WALLET } });
    expect(r2.status).toBe(200);
    expect(r2.json.amount).toBeLessThanOrEqual(r1.json.amount);
  });
});

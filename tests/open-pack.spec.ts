import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.OPEN_PACK_FN;
const WALLET = process.env.TEST_WALLET;
const describeOpenPack = !FN || !WALLET ? describe.skip : describe;

const COST = 100;

function withinTolerance(actual: number, target: number, tolerance: number) {
  return Math.abs(actual - target) <= tolerance;
}

describeOpenPack('REQ-310 Packs spend split', () => {
  it('REQ-310/315/318: soldier pack spend splits cost', async () => {
    const response = await callEdge(FN!, {
      body: {
        walletAddress: WALLET,
        packType: 'soldier',
        cost: COST,
        nonce: `${Date.now()}`
      }
    });

    expect([200, 201]).toContain(response.status);
    expect(response.json?.ok).toBe(true);

    const split = response.json?.split ?? {};
    const burn = Number(split.burn ?? 0);
    const referral = Number(split.referral ?? 0);
    const treasury = Number(split.treasury ?? 0);

    [burn, referral, treasury].forEach(v => expect(Number.isFinite(v)).toBe(true));

    const total = burn + referral + treasury;
    expect(withinTolerance(total, COST, 1)).toBe(true);

    expect(burn).toBeGreaterThan(0);
    expect(burn).toBeGreaterThan(treasury);

    const burnPct = burn / COST;
    expect(burnPct).toBeGreaterThanOrEqual(0.75);
    expect(burnPct).toBeLessThanOrEqual(0.85);

    if (referral > 0) {
      const referralPct = referral / COST;
      expect(referralPct).toBeGreaterThanOrEqual(0.05);
      expect(referralPct).toBeLessThanOrEqual(0.15);
    } else {
      expect(referral).toBe(0);
    }

    const treasuryPct = treasury / COST;
    expect(treasuryPct).toBeGreaterThanOrEqual(0.05);
    expect(treasuryPct).toBeLessThanOrEqual(0.2);

    expect(typeof response.json?.newBalance).toBe('number');
  });
});

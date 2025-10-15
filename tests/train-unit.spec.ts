import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.TRAIN_UNIT_FN;
const WALLET = process.env.TEST_WALLET;
const describeTrainUnit = !FN || !WALLET ? describe.skip : describe;

const COST = 50;

describeTrainUnit('REQ-330 Train unit spend split', () => {
  it('REQ-330/315/318: train unit spend splits cost', async () => {
    const response = await callEdge(FN!, {
      body: {
        walletAddress: WALLET,
        unitId: 'any',
        toLevel: 2,
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
    expect(Math.abs(total - COST)).toBeLessThanOrEqual(1);

    expect(burn).toBeGreaterThan(0);
    expect(burn / COST).toBeGreaterThanOrEqual(0.75);
    expect(burn / COST).toBeLessThanOrEqual(0.85);

    if (referral > 0) {
      const referralPct = referral / COST;
      expect(referralPct).toBeGreaterThanOrEqual(0.05);
      expect(referralPct).toBeLessThanOrEqual(0.2);
    } else {
      expect(referral).toBe(0);
    }

    const treasuryPct = treasury / COST;
    expect(treasuryPct).toBeGreaterThanOrEqual(0.05);
    expect(treasuryPct).toBeLessThanOrEqual(0.2);

    expect(typeof response.json?.newBalance).toBe('number');
  });
});

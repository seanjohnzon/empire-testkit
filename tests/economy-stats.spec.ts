import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.ECONOMY_STATS_FN;
const describeEconomy = !FN ? describe.skip : describe;

describeEconomy('REQ-401 Economy stats', () => {
  it('REQ-401/402: economy stats totals and recents', async () => {
    const response = await callEdge(FN!);

    expect(response.status).toBe(200);
    expect(response.json?.ok ?? true).toBeTruthy();

    const totals = response.json?.totals ?? {};
    expect(typeof totals.claimed).toBe('number');
    expect(typeof totals.spent).toBe('number');
    expect(typeof totals.burned).toBe('number');
    expect(typeof totals.referral).toBe('number');
    expect(typeof totals.treasury).toBe('number');

    const recent = response.json?.recent;
    expect(Array.isArray(recent)).toBe(true);
  });
});

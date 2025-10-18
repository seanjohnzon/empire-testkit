export const SPLIT = { burn: 0.80, ref: 0.10, tre: 0.10 };
export function splitAmount(total: number) {
  const burn = +(total * SPLIT.burn).toFixed(6);
  const ref  = +(total * SPLIT.ref ).toFixed(6);
  const tre  = +(total * SPLIT.tre ).toFixed(6);
  const diff = +(total - (burn+ref+tre)).toFixed(6);
  return { burn: burn+diff, ref, tre };
}



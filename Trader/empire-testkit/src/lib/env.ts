// src/lib/env.ts
// Tolerant env loader: supports both NEXT_PUBLIC_* and server-side names
export const env = {
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "",
  supabaseAnon:
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "",
  testWallet: process.env.TEST_WALLET || "",
  openPackFn: process.env.OPEN_PACK_FN || "open-pack",
  trainUnitFn: process.env.TRAIN_UNIT_FN || "train-unit",
  economyStatsFn: process.env.ECONOMY_STATS_FN || "economy-stats",
  referralCaptureFn: process.env.REFERRAL_CAPTURE_FN || "referral-capture",
  signClaimFn: process.env.SIGN_CLAIM_FN || "sign-claim",
  seasonPubkey: process.env.SEASON_PUBKEY || "",
} as const;

export function requireEnv(name: keyof typeof env) {
  if (!env[name]) throw new Error(`Missing env: ${name}`);
  return env[name]!;
}

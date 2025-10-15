import "dotenv/config";
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  rpc: process.env.SOLANA_RPC_URL!,
  cluster: process.env.SOLANA_CLUSTER || "devnet",
  programId: process.env.PROGRAM_ID!,
  bondMint: process.env.BOND_MINT!,
  seasonPk: process.env.SEASON_PUBKEY!,
  testWalletSecret: process.env.TEST_WALLET_SECRET_BASE58
};
export function requireEnv(name: keyof typeof env) {
  if (!env[name]) throw new Error(`Missing env: ${name}`);
}

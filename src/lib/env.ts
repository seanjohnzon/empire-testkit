export const env = {
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '',
  supabaseAnon:
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '',
};
export function requireEnv(name: keyof typeof env) {
  if (!env[name]) throw new Error(`Missing env: ${name}`);
  return env[name]!;
}

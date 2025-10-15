import { env, requireEnv } from "../src/lib/env.js";
import fetch from "node-fetch";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
export function supaUrl(name: string) { requireEnv("supabaseUrl"); return `${env.supabaseUrl}/functions/v1/${name}`; }
export async function callEdge<T=any>(name: string, init?: { method?: string; body?: any }) {
  requireEnv("supabaseAnon");
  const res = await fetch(supaUrl(name), {
    method: init?.method || "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${env.supabaseAnon}` },
    body: init?.body ? JSON.stringify(init.body) : undefined
  });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json as T;
}
export function devnetConnection() { requireEnv("rpc"); return new Connection(env.rpc, "confirmed"); }
export function testKeypair() { if (!env.testWalletSecret) throw new Error("Missing TEST_WALLET_SECRET_BASE58"); return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env.testWalletSecret))); }
export const toPk = (s: string) => new PublicKey(s);

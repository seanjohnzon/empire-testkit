import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cluster = (Deno.env.get("SOLANA_CLUSTER") ?? "devnet").toLowerCase();
const RPC = cluster === "mainnet"
  ? (Deno.env.get("SOLANA_RPC_MAINNET") ?? "https://api.mainnet-beta.solana.com")
  : (Deno.env.get("SOLANA_RPC_DEVNET") ?? "https://api.devnet.solana.com");

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { walletAddress } = await req.json().catch(() => ({}));
    if (!walletAddress) return new Response(JSON.stringify({ error: "walletAddress required" }), { status: 400, headers: { "content-type":"application/json", ...cors }});

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

    const treasuryKey = cluster === "mainnet" ? "solana_treasury_mainnet" : "solana_treasury_devnet";
    const { data: cfg } = await supabase.from("config").select().in("key", [treasuryKey, "init_price_sol"]);
    const rawTreasury = cfg?.find(c => c.key === treasuryKey)?.value ?? "";
    const rawPrice = cfg?.find(c => c.key === "init_price_sol")?.value ?? "0.5";
    
    const treasury = rawTreasury.trim();
    const priceSol = parseFloat(rawPrice);

    return new Response(JSON.stringify({ treasury, priceSol }), {
      headers: { "content-type":"application/json", ...cors }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), { status: 500, headers: { "content-type":"application/json", ...cors }});
  }
});

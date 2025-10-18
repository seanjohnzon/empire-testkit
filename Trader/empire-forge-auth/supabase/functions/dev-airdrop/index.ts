import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const AIRDROP_RPC = "https://api.devnet.solana.com"; // use the public faucet endpoint
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const { walletAddress, sol } = await req.json().catch(() => ({}));
    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress required" }), { status: 400, headers: { "content-type":"application/json", ...cors }});
    }
    const lamports = Math.floor(((typeof sol === "number" && sol > 0) ? sol : 2) * 1_000_000_000);

    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "requestAirdrop",
      params: [walletAddress, lamports],
    };
    const r = await fetch(AIRDROP_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await r.text(); // capture raw for better errors
    let j: any = null;
    try { j = JSON.parse(text); } catch { /* leave as text */ }

    if (!r.ok || !j?.result) {
      return new Response(JSON.stringify({ error: "airdrop_failed", status: r.status, details: j ?? text }), {
        status: 502,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    return new Response(JSON.stringify({ ok: true, signature: j.result }), {
      headers: { "content-type": "application/json", ...cors },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), { status: 500, headers: { "content-type":"application/json", ...cors }});
  }
});

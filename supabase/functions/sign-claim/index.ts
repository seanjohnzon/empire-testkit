import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { method, json } from "../_shared/db.ts";
import { getPublicKey, sign } from "https://esm.sh/@noble/ed25519@1.9.1";

function getSeed(): Uint8Array {
  const b64 = Deno.env.get("CLAIM_SIGN_SEED");
  if (b64) {
    const bin = atob(b64);
    if (bin.length !== 32) throw new Error("CLAIM_SIGN_SEED must be 32 bytes base64");
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return seed;
}

const seed = getSeed();
const pubkeyBytes = await getPublicKey(seed);
const pubkey = btoa(String.fromCharCode(...pubkeyBytes));
const encoder = new TextEncoder();

serve(async (req) => {
  const guard = method(req, "POST"); if (guard) return guard;
  const body = await req.json().catch(()=>({}));
  const wallet = body.walletAddress || body.wallet;
  if (!wallet) return json({ ok:false, error:"wallet required" }, 400);
  const season = body.seasonId || body.season || null;
  const mp = Number(body.mp ?? body.amount ?? 0);
  const totalMp = Number(body.total_mp ?? body.total ?? 0);
  const nowUnix = Number(body.now_unix ?? Math.floor(Date.now()/1000));
  if (!(mp > 0) && !(body.amount > 0)) return json({ ok:false, error:"mp or amount required" }, 400);

  const halving = totalMp > 0 ? Math.min(10000, Math.max(0, Math.round((mp / totalMp) * 10000))) : 10000;
  const payload = { wallet, season, now_unix: nowUnix, mp, total_mp: totalMp };
  const message = encoder.encode(JSON.stringify(payload));
  const signature = await sign(message, seed);
  const sig = btoa(String.fromCharCode(...signature));

  return json({ ok:true, sig, pubkey, halving_multiplier_bps: halving, payload }, 200);
});

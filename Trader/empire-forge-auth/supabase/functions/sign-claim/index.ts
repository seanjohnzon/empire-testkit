import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { method, json } from "../_shared/db.ts";

function b64(input: Uint8Array) {
  return btoa(String.fromCharCode(...input));
}

serve(async (req) => {
  const guard = method(req, "POST"); if (guard) return guard;
  const { walletAddress, amount, seasonId } = await req.json().catch(()=>({}));
  if (!walletAddress || !(amount>0)) return json({ ok:false, error:"walletAddress and positive amount required" }, 400);
  const payload = JSON.stringify({ walletAddress, amount, seasonId: seasonId||null, t: 0 });
  const data = new TextEncoder().encode(payload);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const sig = b64(digest);
  return json({ ok:true, sig, multiplier: 1.0 }, 200);
});



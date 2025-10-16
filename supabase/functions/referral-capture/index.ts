import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json } from "../_shared/db.ts";
serve(async (req) => {
  const guard = method(req, "POST"); if (guard) return guard;
  const payload = await req.json().catch(()=>({}));
  const wallet = payload.walletAddress || payload.wallet;
  const code = payload.code;
  if (!wallet || !code) return json({ ok:false, error:"wallet and code required" }, 400);
  const s = svc();
  const { data: prof } = await s.from("profiles").select("user_id,referrer_wallet").eq("wallet_address", wallet).maybeSingle();
  if (!prof) return json({ ok:false, error:"profile not found" }, 404);
  if (prof.referrer_wallet && prof.referrer_wallet !== code) {
    return json({ ok:false, error:"referral already set", duplicate:true }, 409);
  }
  if (prof.referrer_wallet === code) {
    return json({ ok:true, duplicate:true }, 200);
  }
  await s.from("profiles").update({ referrer_wallet: code }).eq("user_id", prof.user_id);
  return json({ ok:true }, 200);
});

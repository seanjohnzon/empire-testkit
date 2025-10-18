import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json } from "../_shared/db.ts";
serve(async (req) => {
  const guard = method(req, "GET"); if (guard) return guard;
  const s = svc();
  const [{ data: totals }, { data: recents }] = await Promise.all([
    s.rpc("bond_totals").select().maybeSingle().then(r=>({data:r.data??{bonds_minted:0,bonds_burned:0,players:0}})),
    s.from("bond_ledger").select("id,kind,amount,created_at").order("created_at",{ascending:false}).limit(25)
  ]);
  return json({ ok:true, totals: totals || { bondsMinted:0, bondsBurned:0, players:0 }, recents: recents||[] }, 200);
});

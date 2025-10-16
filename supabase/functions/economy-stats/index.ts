import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json } from "../_shared/db.ts";

serve(async (req) => {
  const guard = method(req, "GET"); if (guard) return guard;
  const s = svc();

  const kinds = ["claim", "spend_pack", "spend_train", "burn", "referral", "treasury"];
  const totals = { claimed: 0, spent: 0, burned: 0, referral: 0, treasury: 0 };

  const { data: ledgerRows, error: ledgerError } = await s
    .from("bond_ledger")
    .select("kind, amount")
    .in("kind", kinds);
  if (ledgerError) return json({ ok: false, error: ledgerError.message }, 500);

  for (const row of ledgerRows ?? []) {
    const amt = Number(row.amount ?? 0);
    switch (row.kind) {
      case "claim":
        totals.claimed += amt;
        break;
      case "spend_pack":
      case "spend_train":
        totals.spent += amt;
        break;
      case "burn":
        totals.burned += amt;
        break;
      case "referral":
        totals.referral += amt;
        break;
      case "treasury":
        totals.treasury += amt;
        break;
    }
  }

  const { data: recent, error: recentError } = await s
    .from("bond_ledger")
    .select("id, kind, amount, created_at, meta")
    .order("created_at", { ascending: false })
    .limit(25);
  if (recentError) return json({ ok: false, error: recentError.message }, 500);

  return json({ ok: true, totals, recent: recent ?? [] }, 200);
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json, getActiveSeason } from "../_shared/db.ts";
import { splitAmount } from "../_shared/bonds.ts";
serve(async (req) => {
  const guard = method(req, "POST"); if (guard) return guard;
  const { walletAddress, unitId, levels=1, toLevel, cost } = await req.json().catch(()=>({}));
  if (!walletAddress || !unitId) return json({ ok:false, error:"walletAddress and unitId required" }, 400);
  const s = svc();
  const season = await getActiveSeason(s);
  const { data: prof } = await s.from("profiles").select("user_id,referrer_wallet").eq("wallet_address", walletAddress).maybeSingle();
  if (!prof) return json({ ok:false, error:"profile not found" }, 404);

  const { data: unit } = await s.from("player_units").select().eq("id", unitId).eq("owner", prof.user_id).maybeSingle();
  if (!unit) return json({ ok:false, error:"unit not found" }, 404);

  const currentLevel = Number(unit.level ?? 1);
  const desiredLevel = Number.isFinite(Number(toLevel)) && Number(toLevel) > currentLevel
    ? Number(toLevel)
    : currentLevel + Number(levels || 1);
  const stepCount = desiredLevel - currentLevel;
  if (stepCount <= 0) return json({ ok:false, error:"target level must exceed current" }, 400);

  let price = Number(cost);
  if (!(price > 0)) {
    let total = 0;
    let lv = currentLevel;
    for (let i = 0; i < stepCount; i++) { total += 10 * (lv + 1); lv++; }
    price = total;
  }

  const { data: inv } = await s.from("inventory_currency").select("war_bonds").eq("owner", prof.user_id).maybeSingle();
  const bal = Number(inv?.war_bonds || 0);
  if (bal < price) return json({ ok:false, error:"insufficient_bonds", need: price, have: bal }, 400);

  const { burn, ref, tre } = splitAmount(price);
  const newBalance = bal - price;

  await s.from("inventory_currency").upsert({ owner: prof.user_id, war_bonds: newBalance }, { onConflict: "owner" });

  if (prof.referrer_wallet && ref > 0) {
    const { data: refProf } = await s.from("profiles").select("user_id").eq("wallet_address", prof.referrer_wallet).maybeSingle();
    if (refProf) {
      const { data: refInv } = await s.from("inventory_currency").select("war_bonds").eq("owner", refProf.user_id).maybeSingle();
      await s.from("inventory_currency").upsert({ owner: refProf.user_id, war_bonds: Number(refInv?.war_bonds||0) + ref }, { onConflict: "owner" });
    }
  }

  const treasuryWallet = Deno.env.get("TREASURY_WALLET") || "";
  if (treasuryWallet && tre > 0) {
    const { data: treProf } = await s.from("profiles").select("user_id").eq("wallet_address", treasuryWallet).maybeSingle();
    if (treProf) {
      const { data: treInv } = await s.from("inventory_currency").select("war_bonds").eq("owner", treProf.user_id).maybeSingle();
      await s.from("inventory_currency").upsert({ owner: treProf.user_id, war_bonds: Number(treInv?.war_bonds||0) + tre }, { onConflict: "owner" });
    }
  }

  await s.from("bond_ledger").insert([
    { user_id: prof.user_id, season_id: season.id, kind: "spend_train", amount: price, meta: { unitId, stepCount, toLevel: desiredLevel } },
    { user_id: prof.user_id, season_id: season.id, kind: "burn",       amount: burn,  meta: { reason: "train_spend" } },
    { user_id: prof.user_id, season_id: season.id, kind: "referral",   amount: ref,   meta: {} },
    { user_id: prof.user_id, season_id: season.id, kind: "treasury",   amount: tre,   meta: {} },
  ]);

  await s.from("player_units").update({ level: desiredLevel }).eq("id", unitId).eq("owner", prof.user_id);

  return json({ ok:true, spent: price, split: { burn, referral: ref, treasury: tre }, newLevel: desiredLevel, newBalance }, 201);
});

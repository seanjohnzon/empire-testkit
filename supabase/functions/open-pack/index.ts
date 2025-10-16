import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json, getActiveSeason } from "../_shared/db.ts";
import { splitAmount } from "../_shared/bonds.ts";
serve(async (req) => {
  const guard = method(req, "POST"); if (guard) return guard;
  const { walletAddress, packType, qty=1, cost } = await req.json().catch(()=>({}));
  if (!walletAddress || !packType) return json({ ok:false, error:"walletAddress and packType required" }, 400);
  const s = svc();
  const season = await getActiveSeason(s);
  const { data: prof } = await s.from("profiles").select("user_id,referrer_wallet").eq("wallet_address", walletAddress).maybeSingle();
  if (!prof) return json({ ok:false, error:"profile not found" }, 404);

  const { data: pack } = await s.from("pack_types").select().eq("slug", packType).maybeSingle();
  if (!pack) return json({ ok:false, error:"unknown pack" }, 404);
  const computedPrice = Number(pack.price_bonds || 0) * Number(qty || 1);
  const price = Number.isFinite(Number(cost)) && Number(cost) > 0 ? Number(cost) : computedPrice;
  if (price <= 0) return json({ ok:false, error:"invalid price" }, 400);

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
    { user_id: prof.user_id, season_id: season.id, kind: "spend_pack", amount: price,  meta: { packType, qty } },
    { user_id: prof.user_id, season_id: season.id, kind: "burn",       amount: burn,   meta: { reason: "pack_spend" } },
    { user_id: prof.user_id, season_id: season.id, kind: "referral",   amount: ref,    meta: { to: prof.referrer_wallet||null } },
    { user_id: prof.user_id, season_id: season.id, kind: "treasury",   amount: tre,    meta: {} },
  ]);

  for (let i=0;i<Number(qty||1);i++) {
    await s.from("player_units").insert({ owner: prof.user_id, unit_type: "common" });
  }

  return json({ ok:true, spent: price, split: { burn, referral: ref, treasury: tre }, granted: Number(qty||1), newBalance }, 201);
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const { walletAddress, updates } = await req.json().catch(() => ({}));
    if (!walletAddress || !updates || typeof updates !== "object") {
      return new Response(JSON.stringify({ error: "walletAddress and updates required" }), { status: 400, headers: { "content-type":"application/json", ...cors }});
    }

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Is there any admin yet?
    const { data: admins } = await supa.from("admin_wallets").select("wallet_address");
    const hasAdmins = (admins?.length ?? 0) > 0;

    // If none, bootstrap with this wallet
    if (!hasAdmins) {
      await supa.from("admin_wallets").insert({ wallet_address: walletAddress }).select().single();
    } else {
      // Else require membership
      const { data: me } = await supa.from("admin_wallets").select("wallet_address").eq("wallet_address", walletAddress).maybeSingle();
      if (!me) {
        return new Response(JSON.stringify({ error: "not_admin" }), { status: 403, headers: { "content-type":"application/json", ...cors }});
      }
    }

    // Apply updates to config
    for (const [key, value] of Object.entries(updates)) {
      await supa.rpc("noop"); // harmless ping to keep Deno warm; optional
      await supa.from("config").upsert({ key, value }, { onConflict: "key" });
    }

    return new Response(JSON.stringify({ ok: true, applied: updates }), { headers: { "content-type":"application/json", ...cors }});
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), { status: 500, headers: { "content-type":"application/json", ...cors }});
  }
});

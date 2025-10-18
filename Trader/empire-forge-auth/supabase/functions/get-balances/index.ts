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
    const { walletAddress } = await req.json().catch(() => ({}));
    if (!walletAddress) return new Response(JSON.stringify({ error: "walletAddress required" }), { status: 400, headers: { "content-type":"application/json", ...cors }});

    const s = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: prof } = await s.from("profiles").select("user_id, mp").eq("wallet_address", walletAddress).maybeSingle();
    if (!prof) return new Response(JSON.stringify({ error: "profile not found" }), { status: 404, headers: { "content-type":"application/json", ...cors }});

    const { data: inv } = await s.from("inventory_currency").select().eq("owner", prof.user_id).maybeSingle();
    return new Response(JSON.stringify({
      ok: true,
      user_id: prof.user_id,
      mp: Number(prof.mp || 0),
      war_bonds: Number(inv?.war_bonds || 0),
    }), { headers: { "content-type":"application/json", ...cors }});
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), { status: 500, headers: { "content-type":"application/json", ...cors }});
  }
});

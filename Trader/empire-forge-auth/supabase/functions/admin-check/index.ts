import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const { walletAddress } = body;

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    const s = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check if wallet is in admin_wallets
    const { data: adminCheck, error: adminError } = await s
      .from("admin_wallets")
      .select("wallet_address")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (adminError) {
      console.error("Admin check error:", adminError);
      throw new Error("Admin verification failed");
    }

    const isAdmin = !!adminCheck;
    const reason = isAdmin ? "allowlist" : null;

    return new Response(JSON.stringify({ ok: true, isAdmin, reason }), {
      headers: { "content-type": "application/json", ...cors },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { "content-type": "application/json", ...cors },
    });
  }
});

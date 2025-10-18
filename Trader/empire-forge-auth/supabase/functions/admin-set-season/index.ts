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
    const { action, walletAddress } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    const s = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check if wallet is admin
    const { data: adminCheck, error: adminError } = await s
      .from("admin_wallets")
      .select("wallet_address")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (adminError) {
      console.error("Admin check error:", adminError);
      throw new Error("Admin verification failed");
    }

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "not_admin" }), {
        status: 403,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    if (action === "create") {
      const { name, emission_per_hour, burn_pct, start_at } = body;
      if (!name || emission_per_hour === undefined || burn_pct === undefined) {
        return new Response(JSON.stringify({ error: "name, emission_per_hour, burn_pct required" }), {
          status: 400,
          headers: { "content-type": "application/json", ...cors },
        });
      }

      const { data, error } = await s.from("seasons").insert({
        name,
        emission_per_hour: Number(emission_per_hour),
        burn_pct: Number(burn_pct),
        start_at: start_at || new Date().toISOString(),
        is_active: false,
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, season: data }), {
        headers: { "content-type": "application/json", ...cors },
      });
    }

    if (action === "update") {
      const { id, name, emission_per_hour, burn_pct, end_at } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400,
          headers: { "content-type": "application/json", ...cors },
        });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (emission_per_hour !== undefined) updates.emission_per_hour = Number(emission_per_hour);
      if (burn_pct !== undefined) updates.burn_pct = Number(burn_pct);
      if (end_at !== undefined) updates.end_at = end_at;

      const { data, error } = await s.from("seasons").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, season: data }), {
        headers: { "content-type": "application/json", ...cors },
      });
    }

    if (action === "toggleActive") {
      const { id, active } = body;
      if (!id || active === undefined) {
        return new Response(JSON.stringify({ error: "id and active required" }), {
          status: 400,
          headers: { "content-type": "application/json", ...cors },
        });
      }

      // If activating, deactivate all others first
      if (active) {
        await s.from("seasons").update({ is_active: false }).neq("id", id);
      }

      const { data, error } = await s.from("seasons").update({ is_active: active }).eq("id", id).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, season: data }), {
        headers: { "content-type": "application/json", ...cors },
      });
    }

    return new Response(JSON.stringify({ error: "invalid action" }), {
      status: 400,
      headers: { "content-type": "application/json", ...cors },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { "content-type": "application/json", ...cors },
    });
  }
});

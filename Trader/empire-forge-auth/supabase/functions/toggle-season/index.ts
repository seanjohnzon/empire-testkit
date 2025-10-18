import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json } from "../_shared/db.ts";

/**
 * Toggle Season (Admin Only)
 * 
 * Sets exactly one season as active. Admin authentication required.
 * 
 * Returns:
 * - 200: Success (season toggled)
 * - 400: Bad request (missing seasonId)
 * - 403: Forbidden (not admin)
 * - 404: Season not found
 * - 405: Method not allowed (must be POST)
 */

serve(async (req) => {
  const guard = method(req, "POST");
  if (guard) return guard;

  try {
    const { seasonId, walletAddress } = await req.json().catch(() => ({}));
    
    if (!seasonId) {
      return json({ ok: false, error: "seasonId required" }, 400);
    }

    const s = svc();

    // Admin check: verify wallet is in admin_wallets table
    if (walletAddress) {
      const { data: adminCheck } = await s
        .from("admin_wallets")
        .select("wallet_address")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (!adminCheck) {
        return json({ ok: false, error: "forbidden", message: "Admin access required" }, 403);
      }
    } else {
      // No wallet provided = not authenticated
      return json({ ok: false, error: "forbidden", message: "Admin access required" }, 403);
    }

    // Verify season exists
    const { data: season } = await s
      .from("seasons")
      .select("id, name, is_active")
      .eq("id", seasonId)
      .maybeSingle();

    if (!season) {
      return json({ ok: false, error: "season not found" }, 404);
    }

    // Deactivate all seasons first
    await s.from("seasons").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");

    // Activate the target season
    await s.from("seasons").update({ is_active: true }).eq("id", seasonId);

    return json({
      ok: true,
      seasonId,
      name: season.name,
      isActive: true,
      message: "Season toggled successfully",
    }, 200);

  } catch (e: any) {
    return json({ ok: false, error: e?.message || "unknown error" }, 500);
  }
});



import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { svc, method, json } from "../_shared/db.ts";

/**
 * Referral Capture
 * 
 * Assigns a referral code to a player's profile (idempotent).
 * 
 * Contract:
 * - 200: First set or same code (idempotent)
 * - 400: Missing wallet or code
 * - 404: Profile not found
 * - 409: Attempting to change existing referrer
 */

serve(async (req) => {
  const guard = method(req, "POST");
  if (guard) return guard;
  
  const { wallet, code } = await req.json().catch(() => ({}));
  
  // Validate inputs
  if (!wallet || !code) {
    return json({ ok: false, error: "wallet and code required" }, 400);
  }
  
  const s = svc();
  
  // Get profile
  const { data: prof } = await s
    .from("profiles")
    .select("user_id, referrer_wallet")
    .eq("wallet_address", wallet)
    .maybeSingle();
  
  // Profile must exist
  if (!prof) {
    return json({ ok: false, error: "profile not found" }, 404);
  }
  
  // If referrer already set
  if (prof.referrer_wallet) {
    // Same code = idempotent success
    if (prof.referrer_wallet === code) {
      return json({ ok: true, message: "referrer already set" }, 200);
    }
    // Different code = conflict
    return json({ ok: false, error: "duplicate", message: "Referrer already set, cannot change" }, 409);
  }
  
  // First time setting referrer
  await s.from("profiles").update({ referrer_wallet: code }).eq("user_id", prof.user_id);
  
  return json({ ok: true, message: "referrer set successfully" }, 200);
});

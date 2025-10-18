/**
 * leaderboard edge function
 * GET /leaderboard?limit=100
 * 
 * Returns top players by total claimed $OIL
 * - Top 100 by sum of claim_history.amount_claimed
 * - Includes invite counts (referrals)
 */

import { svc, CORS, json, method } from "../_shared/db.ts";

Deno.serve(async (req: Request) => {
  const preflight = method(req, "GET");
  if (preflight) return preflight;

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    const supabase = svc();

    // Get top claimers with total claimed amount
    const { data: topClaimers, error: claimError } = await supabase
      .from("claim_history")
      .select("user_id, amount_claimed")
      .order("claimed_at", { ascending: false });

    if (claimError) {
      console.error("Failed to fetch claim history:", claimError);
      return json({ error: "Failed to fetch leaderboard" }, 500);
    }

    // Aggregate by user_id
    const userTotals = new Map<string, number>();
    for (const claim of topClaimers || []) {
      const current = userTotals.get(claim.user_id) || 0;
      userTotals.set(claim.user_id, current + Number(claim.amount_claimed));
    }

    // Sort by total claimed
    const sortedUsers = Array.from(userTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // Get user profiles and referral counts
    const userIds = sortedUsers.map(([userId]) => userId);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, wallet_address, garage_level, created_at")
      .in("user_id", userIds);

    // Get referral counts (how many people they referred)
    const { data: referralCounts } = await supabase
      .from("profiles")
      .select("referrer_wallet")
      .not("referrer_wallet", "is", null);

    const inviteCounts = new Map<string, number>();
    for (const ref of referralCounts || []) {
      if (ref.referrer_wallet) {
        const current = inviteCounts.get(ref.referrer_wallet) || 0;
        inviteCounts.set(ref.referrer_wallet, current + 1);
      }
    }

    // Build leaderboard
    const leaderboard = sortedUsers.map(([userId, totalClaimed], index) => {
      const profile = profiles?.find(p => p.user_id === userId);
      if (!profile) return null;

      return {
        rank: index + 1,
        wallet: profile.wallet_address,
        total_claimed: Math.round(totalClaimed * 100) / 100,
        garage_level: profile.garage_level,
        invites: inviteCounts.get(profile.wallet_address) || 0,
        joined_at: profile.created_at,
      };
    }).filter(Boolean);

    return json({
      ok: true,
      leaderboard,
      total_players: leaderboard.length,
      timestamp: new Date().toISOString(),
    }, 200);

  } catch (error) {
    console.error("leaderboard error:", error);
    return json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

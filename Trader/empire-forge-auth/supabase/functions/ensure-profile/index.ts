import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function walletEmail(wallet: string) {
  // deterministic "email" to make the admin lookup straightforward
  // stays internal; not used for real email flows
  return `wallet_${wallet.toLowerCase()}@example.invalid`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json().catch(() => ({}));
    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress required" }), { 
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supaAdmin = createClient(url, service);

    // 1) If profile already exists, return it
    const { data: existing } = await supaAdmin
      .from("profiles")
      .select()
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (existing) {
      console.log("Profile already exists:", existing.user_id);
      // ensure currency row exists
      await supaAdmin.from("inventory_currency").upsert({ owner: existing.user_id }, { onConflict: "owner" });
      return new Response(JSON.stringify({ ok: true, profile: { user_id: existing.user_id, initialized: existing.initialized } }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // 2) Create (or reuse) an auth user for this wallet
    const email = walletEmail(walletAddress);
    console.log("Creating/finding auth user with email:", email);
    
    let authId: string | null = null;
    
    // Try to create; if it already exists, Supabase returns error code "user_already_exists"
    const created = await supaAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { walletAddress },
    });

    if (created.data?.user?.id) {
      authId = created.data.user.id;
      console.log("Created new auth user:", authId);
    } else if (created.error?.message?.includes("already exists") || created.error?.code === "user_already_exists") {
      // fetch existing by email
      console.log("User already exists, fetching...");
      const got = await supaAdmin.auth.admin.listUsers();
      const match = got.data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (match) {
        authId = match.id;
        console.log("Found existing auth user:", authId);
      }
    } else {
      console.error("Auth user creation failed:", created.error);
    }

    if (!authId) {
      return new Response(JSON.stringify({ error: "Failed to create or find auth user", details: created.error }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // 3) Create the profile linked to the auth user
    const { data: newProfile, error: profileErr } = await supaAdmin
      .from("profiles")
      .insert({ 
        user_id: authId,
        wallet_address: walletAddress, 
        username: `Commander-${crypto.randomUUID().slice(0,6)}`, 
        initialized: false 
      })
      .select()
      .single();

    if (profileErr) {
      console.error("Profile creation error:", profileErr);
      return new Response(JSON.stringify({ error: "Failed to create profile", details: profileErr.message }), { 
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // 4) Ensure currency row exists
    await supaAdmin.from("inventory_currency").upsert({ owner: authId }, { onConflict: "owner" });

    console.log("Profile created successfully:", { user_id: authId, initialized: false });
    return new Response(JSON.stringify({ ok: true, profile: { user_id: authId, initialized: false } }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "unknown error";
    const errorStack = e instanceof Error ? e.stack : undefined;
    console.error("Edge function error:", { message: errorMsg, stack: errorStack });
    return new Response(JSON.stringify({ error: errorMsg }), { 
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});

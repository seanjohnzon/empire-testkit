import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cluster = (Deno.env.get("SOLANA_CLUSTER") ?? "devnet").toLowerCase();
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RPC helpers
async function rpcCall(rpc: string, method: string, params: unknown[]): Promise<unknown | null> {
  const body = { jsonrpc: "2.0", id: 1, method, params };
  const r = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return j?.result ?? null;
}

// Poll getSignatureStatuses until confirmed/finalized
async function waitForTx(sig: string, rpc: string, timeoutMs = 45000): Promise<any | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result: any = await rpcCall(rpc, "getSignatureStatuses", [[sig]]);
    const status = result?.value?.[0];
    if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) {
      // Now fetch the full transaction
      const tx = await rpcCall(rpc, "getTransaction", [sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }]);
      return tx;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return null;
}

async function getParsedTx(sig: string, rpc: string): Promise<any | null> {
  const body = { 
    jsonrpc: "2.0", 
    id: 1, 
    method: "getTransaction", 
    params: [sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0, encoding: "jsonParsed" }] 
  };
  const r = await fetch(rpc, { 
    method: "POST", 
    headers: { "content-type": "application/json" }, 
    body: JSON.stringify(body) 
  });
  const j = await r.json().catch(() => ({}));
  return j?.result ?? null;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, txSignature } = await req.json().catch(() => ({}));
    
    if (!walletAddress || !txSignature) {
      return new Response(
        JSON.stringify({ error: "walletAddress and txSignature required" }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cluster-aware treasury config
    const treasuryKey = cluster === "mainnet" ? "solana_treasury_mainnet" : "solana_treasury_devnet";
    const { data: cfgData } = await supabase.from("config").select().in("key", [treasuryKey, "init_price_sol"]);
    const rawTreasury = cfgData?.find(c => c.key === treasuryKey)?.value ?? "";
    const treasury = rawTreasury.trim();
    const priceSol = parseFloat(cfgData?.find(c => c.key === "init_price_sol")?.value ?? "0.5");

    // Check idempotency
    const { data: existing } = await supabase.from("init_payments").select("id").eq("tx_signature", txSignature).single();
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Transaction already processed", txSignature }),
        { status: 409, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    // RPC endpoints
    const PRIMARY_RPC = cluster === "mainnet"
      ? (Deno.env.get("SOLANA_RPC_MAINNET") ?? "https://api.mainnet-beta.solana.com")
      : (Deno.env.get("SOLANA_RPC_DEVNET") ?? "https://api.devnet.solana.com");
    const PUBLIC_DEVNET_RPC = "https://api.devnet.solana.com";

    // Poll for transaction confirmation
    let tx = await waitForTx(txSignature, PRIMARY_RPC);
    if (!tx && cluster === "devnet" && PRIMARY_RPC !== PUBLIC_DEVNET_RPC) {
      tx = await waitForTx(txSignature, PUBLIC_DEVNET_RPC);
    }

    if (!tx) {
      return new Response(
        JSON.stringify({ pending: true, message: "Transaction not yet confirmed" }),
        { status: 202, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    // Check transaction success
    if (tx.meta?.err) {
      return new Response(
        JSON.stringify({ error: "Transaction failed", debug: { txError: tx.meta.err } }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    // === COMPUTE RECEIVED AMOUNT ===
    
    // (a) Balance delta by account index
    const staticKeys = (tx.transaction?.message?.accountKeys ?? []).map((k: any) => typeof k === "string" ? k : k.pubkey);
    const la = tx.meta?.loadedAddresses ?? {};
    const loadedW = (la.writable ?? []).map((k: any) => typeof k === "string" ? k : (k.pubkey ?? k));
    const loadedR = (la.readonly ?? []).map((k: any) => typeof k === "string" ? k : (k.pubkey ?? k));
    const allKeys = [...staticKeys, ...loadedW, ...loadedR];
    
    const toIdx = allKeys.indexOf(treasury);
    const pre = tx.meta?.preBalances ?? [];
    const post = tx.meta?.postBalances ?? [];
    
    let deltaLamports = 0;
    if (toIdx >= 0 && pre[toIdx] !== undefined && post[toIdx] !== undefined) {
      deltaLamports = post[toIdx] - pre[toIdx];
    }

    // (b) If deltaLamports <= 0, parse transfers
    let parsedLamports = 0;
    let parsedTransfers: any[] = [];
    if (deltaLamports <= 0) {
      const parsed = await getParsedTx(txSignature, PRIMARY_RPC);
      if (parsed) {
        const top = parsed.transaction?.message?.instructions ?? [];
        const inner = (parsed.meta?.innerInstructions ?? []).flatMap((ii: any) => ii.instructions ?? []);
        const all = [...top, ...inner];
        
        for (const ix of all) {
          if (ix?.program === "system" && ix?.parsed?.type === "transfer") {
            const info = ix.parsed.info;
            if (info?.destination === treasury) {
              const lamports = Number(info?.lamports ?? 0);
              parsedLamports += lamports;
              parsedTransfers.push({
                from: info.source,
                destination: info.destination,
                lamports,
              });
            }
          }
        }
      }
    }

    // (c) amountLamports = max(deltaLamports, parsedLamports)
    const amountLamports = Math.max(deltaLamports, parsedLamports);
    const amountSol = amountLamports / 1_000_000_000;
    const method = deltaLamports > 0 ? "delta" : "parsed";

    // (d) Validate
    if (amountLamports === 0) {
      return new Response(
        JSON.stringify({
          error: "Treasury did not receive SOL in this tx",
          debug: {
            treasury,
            toIdx,
            preAt: pre[toIdx],
            postAt: post[toIdx],
            parsedTransfers,
          },
        }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    if (Math.abs(amountSol - priceSol) > 0.000001) {
      return new Response(
        JSON.stringify({
          error: "Incorrect amount",
          debug: {
            expected: priceSol,
            got: amountSol,
            deltaLamports,
            parsedLamports,
          },
        }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    // === SUCCESS PATH ===
    
    // Get or create user profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    let userId = profile?.user_id;

    if (!userId) {
      // Create anonymous user
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: `${walletAddress}@wallet.local`,
        email_confirm: true,
      });
      
      if (userError) throw userError;
      userId = newUser.user.id;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        wallet_address: walletAddress,
        initialized: true,
        last_claim_at: new Date().toISOString(),
      });
      
      if (profileError) throw profileError;
    } else {
      // Update existing profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          initialized: true,
          last_claim_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
        
      if (updateError) throw updateError;
    }

    // Ensure we have userId before proceeding
    if (!userId) {
      throw new Error("Failed to get or create user profile");
    }

    // Get existing war_bonds
    const { data: existingCurrency } = await supabase
      .from("inventory_currency")
      .select("war_bonds")
      .eq("owner", userId)
      .maybeSingle();

    const currentBonds = Number(existingCurrency?.war_bonds ?? 0);
    const newBonds = Math.max(currentBonds, 0) + 200;

    // Upsert inventory currency - add 200 war_bonds to existing
    const { error: currencyError } = await supabase.from("inventory_currency").upsert({
      owner: userId,
      war_bonds: newBonds,
    }, { onConflict: "owner" });
    
    if (currencyError) {
      console.error("Failed to seed inventory:", currencyError);
      throw currencyError;
    }

    console.log(`💰 Seeded inventory for user ${userId}: ${newBonds} war_bonds (added 200)`);

    // Get 3 random common units
    const { data: commonUnits } = await supabase
      .from("unit_blueprints")
      .select("id")
      .eq("rarity", "common")
      .limit(100);

    if (commonUnits && commonUnits.length > 0) {
      const selectedUnits = [];
      for (let i = 0; i < 3; i++) {
        const randomIdx = Math.floor(Math.random() * commonUnits.length);
        selectedUnits.push({
          owner: userId,
          blueprint: commonUnits[randomIdx].id,
          level: 1,
          rank: 0,
        });
      }
      await supabase.from("units").insert(selectedUnits);
    }

    // Record payment
    await supabase.from("init_payments").insert({
      wallet_address: walletAddress,
      tx_signature: txSignature,
      amount_sol: priceSol,
    });

    // Recompute MP
    await supabase.rpc("recompute_mp", { p_user: userId });

    console.log(`✅ Init success: ${walletAddress}, amount: ${amountSol} SOL, method: ${method}`);

    return new Response(
      JSON.stringify({
        ok: true,
        amountSol,
        cluster,
        method,
      }),
      { headers: { "content-type": "application/json", ...corsHeaders } }
    );

  } catch (err: any) {
    console.error("verify-init error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error", stack: err?.stack }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    );
  }
});

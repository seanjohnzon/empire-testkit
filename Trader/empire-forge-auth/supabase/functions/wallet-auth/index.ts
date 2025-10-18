import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { wallet_address } = await req.json();

    if (!wallet_address) {
      throw new Error('Wallet address is required');
    }

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('wallet_address', wallet_address)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingProfile) {
      return new Response(
        JSON.stringify({ profile: existingProfile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new profile
    const shortId = crypto.randomUUID().slice(0, 6);
    const username = `Commander-${shortId}`;

    // Generate a UUID for user_id (since we're not using Supabase Auth)
    const userId = crypto.randomUUID();

    const { data: newProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        user_id: userId,
        wallet_address,
        username,
        initialized: false,
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // Create inventory_currency record
    const { error: currencyError } = await supabaseClient
      .from('inventory_currency')
      .insert({
        owner: userId,
        iron: 0,
        war_bonds: 0,
      });

    if (currencyError) {
      throw currencyError;
    }

    return new Response(
      JSON.stringify({ profile: newProfile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

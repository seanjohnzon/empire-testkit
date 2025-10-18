// Quick healthcheck script
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function query(table, select = '*') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

console.log('=== DATABASE HEALTHCHECKS ===\n');

try {
  // 1. Pack Odds
  console.log('✓ Checking pack_odds...');
  const odds = await query('pack_odds');
  console.log(`  Count: ${odds.length} (expected: 7)`);
  odds.forEach(o => console.log(`    - ${o.tier_key}: ${o.odds_pct}%`));
  
  // 2. Seasons
  console.log('\n✓ Checking seasons...');
  const seasons = await query('seasons');
  seasons.forEach(s => console.log(`    - ${s.name} | Active: ${s.is_active}`));
  
  // 3. Car Tiers
  console.log('\n✓ Checking car_tiers...');
  const tiers = await query('car_tiers');
  console.log(`  Count: ${tiers.length} (expected: 7)`);
  tiers.sort((a,b) => a.hp_base - b.hp_base).forEach(t => 
    console.log(`    - ${t.tier_key.padEnd(10)} | HP: ${String(t.hp_base).padStart(5)} | Grip: ${t.grip_pct}%`)
  );
  
  // 4. Profiles (test wallet)
  if (process.env.TEST_WALLET) {
    console.log('\n✓ Checking test wallet profile...');
    const profiles = await query('profiles', 'wallet_address,garage_level');
    const testProfile = profiles.find(p => p.wallet_address === process.env.TEST_WALLET);
    if (testProfile) {
      console.log(`    - Found: ${testProfile.wallet_address.slice(0,8)}... | Garage Level: ${testProfile.garage_level}`);
    } else {
      console.log(`    - Not found (will create on first API call)`);
    }
  }
  
  console.log('\n✅ ALL HEALTHCHECKS PASSED\n');
  
} catch (error) {
  console.error('\n❌ HEALTHCHECK FAILED:', error.message);
  process.exit(1);
}


/**
 * scripts/load-card-images.ts
 * Usage:  npx tsx scripts/load-card-images.ts
 *
 * - Upserts image assets into car_assets
 * - Sets car_catalog.card_image_url (first 'card' by our preference per car)
 * - Reports missing cars
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in environment');
  console.error('   Found URL:', url ? '✓' : '✗');
  console.error('   Found KEY:', key ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Canonical car_key set from our spec (must match car_catalog.car_key values)
const CANONICAL_CARS = [
  // GODSPEED
  'lotus_evija','pagani_utopia','solus_gt','la_voiture_noire',
  // PROTOTYPE
  'amg_one','valkyrie','devel_sixteen','terzo_millennio',
  // HYPERCAR
  'chiron','jesko','speedtail','nevera',
  // SUPERCAR
  'aventador','ferrari_488_gtb','mclaren_720s','audi_r8_v10',
  // SPORT
  'supra','gt350r','gt4','m4_gts',
  // STREET
  'skyline','rx7','evo','wrx_sti',
  // BEATER
  'civic','corolla','f150','miata',
];

// === YOUR PROVIDED URLS ===
// Map each URL to a car_key and a kind ("card" by default). If uncertain, leave car_key as null.
type Entry = { car_key: string | null; url: string; asset_key: string; kind?: 'card'|'thumb'|'render'|'badge'|'pack'|'alt' };

const ENTRIES: Entry[] = [
  { car_key: 'amg_one', url: 'https://ik.imagekit.io/homecraft/racergame/merco.jpg?updatedAt=1760775610533', asset_key: 'merco', kind: 'card' },
  { car_key: 'evo', url: 'https://ik.imagekit.io/homecraft/racergame/mitsbshi.jpg?updatedAt=1760775610444', asset_key: 'mitsbshi', kind: 'card' },
  { car_key: 'valkyrie', url: 'https://ik.imagekit.io/homecraft/racergame/aston.jpg?updatedAt=1760775610419', asset_key: 'aston', kind: 'card' },
  // Ford: we have both GT350R and F-150 in our catalog; gray might be truck
  { car_key: 'gt350r', url: 'https://ik.imagekit.io/homecraft/racergame/ford.jpg?updatedAt=1760775610425', asset_key: 'ford', kind: 'card' },
  { car_key: 'f150', url: 'https://ik.imagekit.io/homecraft/racergame/fordGray.jpg?updatedAt=1760775610397', asset_key: 'fordGray', kind: 'card' },

  { car_key: 'chiron', url: 'https://ik.imagekit.io/homecraft/racergame/bugattired.jpg?updatedAt=1760775610409', asset_key: 'bugattired', kind: 'alt' },
  { car_key: 'chiron', url: 'https://ik.imagekit.io/homecraft/racergame/bugatti.jpg?updatedAt=1760775610344', asset_key: 'bugatti', kind: 'card' },

  // Porsche: our catalog uses GT4
  { car_key: 'gt4', url: 'https://ik.imagekit.io/homecraft/racergame/porsho.jpg?updatedAt=1760775610422', asset_key: 'porsho', kind: 'card' },

  { car_key: 'ferrari_488_gtb', url: 'https://ik.imagekit.io/homecraft/racergame/fero.jpg?updatedAt=1760775610374', asset_key: 'fero', kind: 'card' },

  { car_key: 'aventador', url: 'https://ik.imagekit.io/homecraft/racergame/lambogold.jpg?updatedAt=1760775610397', asset_key: 'lambogold', kind: 'alt' },
  { car_key: 'aventador', url: 'https://ik.imagekit.io/homecraft/racergame/lambo.jpg?updatedAt=1760775610635', asset_key: 'lambo', kind: 'card' },

  { car_key: 'jesko', url: 'https://ik.imagekit.io/homecraft/racergame/koenigsegg.jpg?updatedAt=1760775610267', asset_key: 'koenigsegg', kind: 'card' },
  { car_key: 'devel_sixteen', url: 'https://ik.imagekit.io/homecraft/racergame/devel.jpg?updatedAt=1760775610304', asset_key: 'devel', kind: 'card' },
  { car_key: 'm4_gts', url: 'https://ik.imagekit.io/homecraft/racergame/bmw.jpg?updatedAt=1760775610290', asset_key: 'bmw', kind: 'card' },
  { car_key: 'wrx_sti', url: 'https://ik.imagekit.io/homecraft/racergame/subaru.jpg?updatedAt=1760775610407', asset_key: 'subaru', kind: 'card' },
  { car_key: 'audi_r8_v10', url: 'https://ik.imagekit.io/homecraft/racergame/audi.jpg?updatedAt=1760775610413', asset_key: 'audi', kind: 'card' },

  // Mazda: we have both rx7 and miata; use rx7 for "mazdagr" and miata for "mazda"
  { car_key: 'miata', url: 'https://ik.imagekit.io/homecraft/racergame/mazda.jpg?updatedAt=1760775610217', asset_key: 'mazda', kind: 'card' },
  { car_key: 'rx7', url: 'https://ik.imagekit.io/homecraft/racergame/mazdagr.jpg?updatedAt=1760775610216', asset_key: 'mazdagr', kind: 'card' },

  { car_key: 'lotus_evija', url: 'https://ik.imagekit.io/homecraft/racergame/lotus.jpg?updatedAt=1760775610289', asset_key: 'lotus', kind: 'card' },

  // McLaren: we have both speedtail and 720s; map black to speedtail, orange to 720s
  { car_key: 'speedtail', url: 'https://ik.imagekit.io/homecraft/racergame/mclaren.jpg?updatedAt=1760775610229', asset_key: 'mclaren', kind: 'card' },
  { car_key: 'mclaren_720s', url: 'https://ik.imagekit.io/homecraft/racergame/mclorange.jpg?updatedAt=1760775609119', asset_key: 'mclorange', kind: 'card' },

  { car_key: 'skyline', url: 'https://ik.imagekit.io/homecraft/racergame/nissan.jpg?updatedAt=1760775608255', asset_key: 'nissan', kind: 'card' },
  { car_key: 'civic', url: 'https://ik.imagekit.io/homecraft/racergame/honda%20civic.jpg?updatedAt=1760775608549', asset_key: 'honda-civic', kind: 'card' },
  { car_key: 'nevera', url: 'https://ik.imagekit.io/homecraft/racergame/rimac.jpg?updatedAt=1760775610035', asset_key: 'rimac', kind: 'card' },

  // Zenvo is NOT in our catalog → leave unmapped for now
  { car_key: null, url: 'https://ik.imagekit.io/homecraft/racergame/zenvo.jpg?updatedAt=1760775610194', asset_key: 'zenvo', kind: 'card' },

  { car_key: 'supra', url: 'https://ik.imagekit.io/homecraft/racergame/toyota.jpg?updatedAt=1760775608268', asset_key: 'toyota', kind: 'card' },
];

async function main() {
  console.log('🚗 Loading car card images...\n');

  // Load current car_catalog keys to validate mapping
  const { data: cars, error: carsErr } = await supabase
    .from('car_catalog')
    .select('car_key');
  if (carsErr) throw carsErr;

  const keys = new Set((cars ?? []).map(c => c.car_key));
  const notInCatalog = new Set<string>();
  const inserts: any[] = [];
  const primaries = new Map<string, string>(); // car_key -> chosen card url

  for (const e of ENTRIES) {
    if (!e.car_key) continue; // skip unmapped
    if (!keys.has(e.car_key)) {
      notInCatalog.add(e.car_key);
      continue;
    }
    inserts.push({
      car_key: e.car_key,
      asset_key: e.asset_key,
      url: e.url,
      kind: e.kind ?? 'card',
    });
    // Choose primary card image if we don't have one yet, prefer kind=='card'
    if (!primaries.has(e.car_key) && (e.kind ?? 'card') === 'card') {
      primaries.set(e.car_key, e.url);
    }
  }

  if (notInCatalog.size) {
    console.warn('⚠️  These car_keys are not present in car_catalog:', Array.from(notInCatalog));
  }

  // Upsert assets
  if (inserts.length) {
    console.log(`📦 Upserting ${inserts.length} asset(s) to car_assets...`);
    const { error: upErr } = await supabase
      .from('car_assets')
      .upsert(inserts, { onConflict: 'car_key,asset_key,kind' });
    if (upErr) throw upErr;
    console.log('✅ Assets upserted successfully\n');
  }

  // Set primary card_image_url per car
  console.log(`🖼️  Setting primary card images for ${primaries.size} car(s)...`);
  for (const [car_key, url] of primaries.entries()) {
    const { error: updErr } = await supabase
      .from('car_catalog')
      .update({ card_image_url: url })
      .eq('car_key', car_key);
    if (updErr) throw updErr;
  }
  console.log('✅ Primary card images set\n');

  // Reporting
  const covered = new Set(ENTRIES.filter(e => e.car_key).map(e => e.car_key!));
  const missing = CANONICAL_CARS.filter(k => !covered.has(k));
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('✅ Cars with images (' + covered.size + '/' + CANONICAL_CARS.length + '):');
  Array.from(covered).sort().forEach(k => console.log(`   - ${k}`));
  
  if (missing.length > 0) {
    console.log('\n⛱️  Missing images (' + missing.length + '):');
    missing.forEach(k => console.log(`   - ${k}`));
    console.log('\n💡 These cars need images to be provided.');
  }

  const unmappedUrls = ENTRIES.filter(e => !e.car_key).map(e => ({ key: e.asset_key, url: e.url }));
  if (unmappedUrls.length) {
    console.log('\n⚠️  Unmapped URLs (not in catalog):');
    unmappedUrls.forEach(u => console.log(`   - ${u.key}: ${u.url}`));
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 Image loading complete!\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});


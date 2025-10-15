# Source Snapshot

## .env.example

```example
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TEST_WALLET=27iC4pJHhc4ZnAsbmAPFHV6deWz3BWWqD9QFEJxoCun9
# Optional edge function overrides
OPEN_PACK_FN=open-pack
TRAIN_UNIT_FN=train-unit
ECONOMY_STATS_FN=economy-stats
REFERRAL_CAPTURE_FN=referral-capture
SIGN_CLAIM_FN=sign-claim
SEASON_PUBKEY=11111111111111111111111111111111

```

## package.json

```json
{
  "name": "empire-testkit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run --reporter=verbose --reporter=json --outputFile=.vitest-reports/json.json",
    "report:req": "node scripts/gen-req-report.mjs",
    "ci": "npm run test && npm run report:req",
    "snapshot": "node scripts/snapshot.mjs"
  },
  "devDependencies": {
    "@coral-xyz/anchor": "0.30.1",
    "@types/node": "^20.11.27",
    "dotenv": "^16.4.5",
    "node-fetch": "^3.3.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3",
    "vitest": "^1.6.0"
  },
  "dependencies": {
    "@solana/spl-token": "^0.4.6",
    "@solana/web3.js": "^1.95.3"
  }
}

```

## README.md

```md
# empire-testkit

```

## scripts/gen-req-report.mjs

```mjs
import fs from 'node:fs';
import path from 'node:path';
import { REQ_MAP } from '../tests/reqmap.js';

const resultsPath = path.resolve('.vitest-reports', 'json.json');
const outPath = path.resolve('reports', 'requirements.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

let passed = new Set<string>();
let failed = new Set<string>();
let unknown = new Set<string>();

try {
  const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  for (const t of raw?.testResults || []) {
    const name = t.name || '';
    const status = t.status || 'unknown';
    const reqs = REQ_MAP[name] || [];
    if (reqs.length === 0) unknown.add(name);
    if (status === 'pass') reqs.forEach(id => passed.add(id));
    else if (status === 'fail') reqs.forEach(id => failed.add(id));
  }
} catch (e) {
  console.error('No vitest JSON found. Run tests first.');
}

const all = new Set([...passed, ...failed]);
let md = `# Requirements Coverage\n\n`;
md += `**Passed:** ${[...passed].sort().join(', ') || '—'}\n\n`;
md += `**Failed:** ${[...failed].sort().join(', ') || '—'}\n\n`;
md += `**Seen:** ${[...all].sort().join(', ') || '—'}\n\n`;
if (unknown.size) {
  md += `## Unmapped tests\n`;
  for (const n of unknown) md += `- ${n}\n`;
}
fs.writeFileSync(outPath, md);
console.log('Wrote', outPath);

```

## scripts/snapshot.mjs

```mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'reports', 'source-snapshot.md');
const ignore = new Set([
  'node_modules',
  '.git',
  '.github',
  '.vitest-reports',
  'dist',
  'build',
  'coverage',
  '.next'
]);

function walk(dir = '') {
  const abs = path.join(root, dir);
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = entry.name;
    if (ignore.has(name)) continue;
    const rel = dir ? `${dir}/${name}` : name;
    if (entry.isDirectory()) {
      files.push(...walk(rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files;
}

const files = walk('').sort((a, b) => a.localeCompare(b));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

let md = '# Source Snapshot\n\n';
for (const rel of files) {
  if (rel === 'reports/source-snapshot.md') continue;
  const abs = path.join(root, rel);
  const ext = path.extname(rel).slice(1) || 'text';
  const content = fs.readFileSync(abs, 'utf8');
  md += `## ${rel}\n\n`;
  md += `\`\`\`${ext}\n`;
  md += `${content.replace(/\r\n/g, '\n')}\n`;
  md += '\`\`\`\n\n';
}
fs.writeFileSync(outputPath, md, 'utf8');
console.log('Wrote', path.relative(root, outputPath));

```

## src/lib/env.ts

```ts
import "dotenv/config";
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  rpc: process.env.SOLANA_RPC_URL!,
  cluster: process.env.SOLANA_CLUSTER || "devnet",
  programId: process.env.PROGRAM_ID!,
  bondMint: process.env.BOND_MINT!,
  seasonPk: process.env.SEASON_PUBKEY!,
  testWalletSecret: process.env.TEST_WALLET_SECRET_BASE58
};
export function requireEnv(name: keyof typeof env) {
  if (!env[name]) throw new Error(`Missing env: ${name}`);
}

```

## src/lib/metrics.ts

```ts
import { promises as fs } from "fs";
import path from "path";
import { REQUIREMENTS } from "../requirements.js";
type Result = { id: string; passed: boolean; details?: string };
(async () => {
  const p = path.join(process.cwd(), "tests", ".results.json");
  const exists = await fs.stat(p).then(()=>true).catch(()=>false);
  const results: Result[] = exists ? JSON.parse(await fs.readFile(p,"utf8")) : [];
  const map = new Map(results.map(r=>[r.id, r]));
  const passed = REQUIREMENTS.filter(r => map.get(r.id)?.passed).length;
  const total = REQUIREMENTS.length;
  const percent = total ? Math.round((passed/total)*100) : 0;
  await fs.writeFile("report.json", JSON.stringify({ total, passed, percent, results }, null, 2));
  console.log(`Completed: ${passed}/${total} (${percent}%)`);
  for (const r of REQUIREMENTS) console.log(`${map.get(r.id)?.passed ? "✅" : "❌"} ${r.id} - ${r.title}`);
})();

```

## src/requirements.ts

```ts
export type Requirement = { id: `REQ-${number}`; title: string; description: string; tags: ("edge"|"chain"|"ui")[]; };
export const REQUIREMENTS: Requirement[] = [
  { id: "REQ-001", title: "Admin can list seasons", description: "list-seasons returns array", tags: ["edge"] },
  { id: "REQ-002", title: "Admin can toggle season active", description: "toggleActive works", tags: ["edge"] },
  { id: "REQ-003", title: "Economy stats aggregates", description: "economy-stats totals+recent", tags: ["edge"] },
  { id: "REQ-010", title: "On-chain claim mints bonds", description: "claim mints to ATA", tags: ["chain"] },
  { id: "REQ-011", title: "On-chain spend burns bonds", description: "spend burns amount", tags: ["chain"] }
];

```

## tests/_utils.ts

```ts
import { env, requireEnv } from "../src/lib/env.js";
import fetch from "node-fetch";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
export function supaUrl(name: string) { requireEnv("supabaseUrl"); return `${env.supabaseUrl}/functions/v1/${name}`; }
export async function callEdge<T=any>(name: string, init?: { method?: string; body?: any }) {
  requireEnv("supabaseAnon");
  const res = await fetch(supaUrl(name), {
    method: init?.method || "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${env.supabaseAnon}` },
    body: init?.body ? JSON.stringify(init.body) : undefined
  });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json as T;
}
export function devnetConnection() { requireEnv("rpc"); return new Connection(env.rpc, "confirmed"); }
export function testKeypair() { if (!env.testWalletSecret) throw new Error("Missing TEST_WALLET_SECRET_BASE58"); return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env.testWalletSecret))); }
export const toPk = (s: string) => new PublicKey(s);

```

## tests/_utils/callEdge.ts

```ts
import 'dotenv/config';

const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const anon = process.env.SUPABASE_ANON_KEY;

if (!base || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');

export async function callEdge(name: string, init: RequestInit & { body?: any } = {}) {
  const url = `${base}/functions/v1/${name}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: anon!,
    Authorization: `Bearer ${anon!}`,
    ...(init.headers || {})
  };
  let body = (init as any).body;
  if (body && typeof body !== 'string') body = JSON.stringify(body);
  const res = await fetch(url, { method: 'POST', ...init, headers, body });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

```

## tests/.results.json

```json
[]

```

## tests/claim-rewards.spec.ts

```ts
import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const WALLET = process.env.TEST_WALLET!; // must exist in profiles.wallet_address

describe('REQ-105 Claim (DB mode) + REQ-124/242 Halving', () => {
  it('REQ-105A: 400 when walletAddress missing', async () => {
    const r = await callEdge('claim-rewards', { body: {} });
    expect(r.status).toBe(400);
    expect((r.json.error || '').toLowerCase()).toContain('walletaddress');
  });

  it('REQ-105B: 200 and returns breakdown for known wallet', async () => {
    const r = await callEdge('claim-rewards', { body: { walletAddress: WALLET } });
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
    expect(typeof r.json.amount).toBe('number');
    const b = r.json.breakdown;
    expect(b && typeof b.E_base === 'number').toBe(true);
    expect(b && typeof b.H === 'number').toBe(true);
    expect(b.H).toBeGreaterThanOrEqual(0);
    expect(b.H).toBeLessThanOrEqual(1);
    expect(b && typeof b.E_season === 'number').toBe(true);
    expect(b && typeof b.share === 'number').toBe(true);
  });

  it('REQ-201: cooldown immediate second call yields <= previous', async () => {
    const r1 = await callEdge('claim-rewards', { body: { walletAddress: WALLET } });
    const r2 = await callEdge('claim-rewards', { body: { walletAddress: WALLET } });
    expect(r2.status).toBe(200);
    expect(r2.json.amount).toBeLessThanOrEqual(r1.json.amount);
  });
});

```

## tests/economy-stats.spec.ts

```ts
import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.ECONOMY_STATS_FN;
const describeEconomy = !FN ? describe.skip : describe;

describeEconomy('REQ-401 Economy stats', () => {
  it('REQ-401/402: economy stats totals and recents', async () => {
    const response = await callEdge(FN!);

    expect(response.status).toBe(200);
    expect(response.json?.ok ?? true).toBeTruthy();

    const totals = response.json?.totals ?? {};
    expect(typeof totals.claimed).toBe('number');
    expect(typeof totals.spent).toBe('number');
    expect(typeof totals.burned).toBe('number');
    expect(typeof totals.referral).toBe('number');
    expect(typeof totals.treasury).toBe('number');

    const recent = response.json?.recent;
    expect(Array.isArray(recent)).toBe(true);
  });
});

```

## tests/edge.seasons.spec.ts

```ts
import { it, expect, afterAll } from "vitest";
import { callEdge } from "./_utils.js";
import { promises as fs } from "fs";
const results: any[] = [];
afterAll(async () => { await fs.writeFile("tests/.results.json", JSON.stringify(results, null, 2)); });
it("REQ-001 list-seasons returns array", async () => {
  const res = await callEdge("list-seasons", { method: "POST" });
  expect(res.ok).toBe(true); expect(Array.isArray(res.seasons)).toBe(true);
  results.push({ id: "REQ-001", passed: true });
});
it("REQ-002 toggle active works (no-op ok)", async () => {
  const list = await callEdge("list-seasons", { method: "POST" });
  const first = list.seasons?.[0]; expect(first).toBeTruthy();
  await callEdge("admin-set-season", { method: "POST", body: { walletAddress: "TEST", action: "toggleActive", id: first.id, active: !!first.is_active } });
  results.push({ id: "REQ-002", passed: true });
});

```

## tests/open-pack.spec.ts

```ts
import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.OPEN_PACK_FN;
const WALLET = process.env.TEST_WALLET;
const describeOpenPack = !FN || !WALLET ? describe.skip : describe;

const COST = 100;

function withinTolerance(actual: number, target: number, tolerance: number) {
  return Math.abs(actual - target) <= tolerance;
}

describeOpenPack('REQ-310 Packs spend split', () => {
  it('REQ-310/315/318: soldier pack spend splits cost', async () => {
    const response = await callEdge(FN!, {
      body: {
        walletAddress: WALLET,
        packType: 'soldier',
        cost: COST,
        nonce: `${Date.now()}`
      }
    });

    expect([200, 201]).toContain(response.status);
    expect(response.json?.ok).toBe(true);

    const split = response.json?.split ?? {};
    const burn = Number(split.burn ?? 0);
    const referral = Number(split.referral ?? 0);
    const treasury = Number(split.treasury ?? 0);

    [burn, referral, treasury].forEach(v => expect(Number.isFinite(v)).toBe(true));

    const total = burn + referral + treasury;
    expect(withinTolerance(total, COST, 1)).toBe(true);

    expect(burn).toBeGreaterThan(0);
    expect(burn).toBeGreaterThan(treasury);

    const burnPct = burn / COST;
    expect(burnPct).toBeGreaterThanOrEqual(0.75);
    expect(burnPct).toBeLessThanOrEqual(0.85);

    if (referral > 0) {
      const referralPct = referral / COST;
      expect(referralPct).toBeGreaterThanOrEqual(0.05);
      expect(referralPct).toBeLessThanOrEqual(0.15);
    } else {
      expect(referral).toBe(0);
    }

    const treasuryPct = treasury / COST;
    expect(treasuryPct).toBeGreaterThanOrEqual(0.05);
    expect(treasuryPct).toBeLessThanOrEqual(0.2);

    expect(typeof response.json?.newBalance).toBe('number');
  });
});

```

## tests/referral-capture.spec.ts

```ts
import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.REFERRAL_CAPTURE_FN;
const WALLET = process.env.TEST_WALLET;
const describeReferral = !FN || !WALLET ? describe.skip : describe;

describeReferral('REQ-520 Referral capture', () => {
  it('REQ-520/521: referral capture idempotent', async () => {
    const response = await callEdge(FN!, {
      body: { walletAddress: WALLET, code: 'DUMMY' }
    });

    expect([200, 409]).toContain(response.status);

    if (response.status === 200) {
      expect(response.json?.ok).toBe(true);
    } else {
      const message = String(response.json?.error || response.json?.message || '').toLowerCase();
      expect(message.length).toBeGreaterThan(0);
    }
  });
});

```

## tests/reqmap.js

```js
export const REQ_MAP = {
  // test name substring  -> REQ ids this test covers
  'REQ-105A: 400 when walletAddress missing': ['REQ-105'],
  'REQ-105B: 200 and returns breakdown for known wallet': ['REQ-105', 'REQ-124', 'REQ-242'],
  'REQ-201: cooldown immediate second call yields <= previous': ['REQ-201'],
  'REQ-310/315/318: soldier pack spend splits cost': ['REQ-310', 'REQ-315', 'REQ-318'],
  'REQ-330/315/318: train unit spend splits cost': ['REQ-330', 'REQ-315', 'REQ-318'],
  'REQ-401/402: economy stats totals and recents': ['REQ-401', 'REQ-402'],
  'REQ-520/521: referral capture idempotent': ['REQ-520', 'REQ-521'],
  'REQ-160/145: sign claim returns signature and halving multiplier': ['REQ-160', 'REQ-145']
};

```

## tests/reqmap.ts

```ts
export const REQ_MAP: Record<string, string[]> = {
  // test name substring  -> REQ ids this test covers
  'REQ-105A: 400 when walletAddress missing': ['REQ-105'],
  'REQ-105B: 200 and returns breakdown for known wallet': ['REQ-105', 'REQ-124', 'REQ-242'],
  'REQ-201: cooldown immediate second call yields <= previous': ['REQ-201'],
  'REQ-310/315/318: soldier pack spend splits cost': ['REQ-310', 'REQ-315', 'REQ-318'],
  'REQ-330/315/318: train unit spend splits cost': ['REQ-330', 'REQ-315', 'REQ-318'],
  'REQ-401/402: economy stats totals and recents': ['REQ-401', 'REQ-402'],
  'REQ-520/521: referral capture idempotent': ['REQ-520', 'REQ-521'],
  'REQ-160/145: sign claim returns signature and halving multiplier': ['REQ-160', 'REQ-145']
};

```

## tests/sign-claim.spec.ts

```ts
import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.SIGN_CLAIM_FN;
const WALLET = process.env.TEST_WALLET;
const SEASON = process.env.SEASON_PUBKEY || '11111111111111111111111111111111';
const describeSignClaim = !FN || !WALLET ? describe.skip : describe;

describeSignClaim('REQ-160 Sign claim oracle', () => {
  it('REQ-160/145: sign claim returns signature and halving multiplier', async () => {
    const response = await callEdge(FN!, {
      body: {
        season: SEASON,
        wallet: WALLET,
        now_unix: Math.floor(Date.now() / 1000),
        mp: 10,
        total_mp: 100
      }
    });

    expect(response.status).toBe(200);
    expect(response.json?.ok).toBe(true);
    expect(typeof response.json?.sig).toBe('string');
    expect(response.json.sig.length).toBeGreaterThan(0);
    expect(typeof response.json?.pubkey).toBe('string');
    expect(response.json.pubkey.length).toBeGreaterThan(0);
    expect(typeof response.json?.halving_multiplier_bps).toBe('number');
    expect(response.json.halving_multiplier_bps).toBeGreaterThanOrEqual(0);
    expect(response.json.halving_multiplier_bps).toBeLessThanOrEqual(10000);
  });
});

```

## tests/train-unit.spec.ts

```ts
import { describe, it, expect } from 'vitest';
import { callEdge } from './_utils/callEdge';
import 'dotenv/config';

const FN = process.env.TRAIN_UNIT_FN;
const WALLET = process.env.TEST_WALLET;
const describeTrainUnit = !FN || !WALLET ? describe.skip : describe;

const COST = 50;

describeTrainUnit('REQ-330 Train unit spend split', () => {
  it('REQ-330/315/318: train unit spend splits cost', async () => {
    const response = await callEdge(FN!, {
      body: {
        walletAddress: WALLET,
        unitId: 'any',
        toLevel: 2,
        cost: COST,
        nonce: `${Date.now()}`
      }
    });

    expect([200, 201]).toContain(response.status);
    expect(response.json?.ok).toBe(true);

    const split = response.json?.split ?? {};
    const burn = Number(split.burn ?? 0);
    const referral = Number(split.referral ?? 0);
    const treasury = Number(split.treasury ?? 0);

    [burn, referral, treasury].forEach(v => expect(Number.isFinite(v)).toBe(true));

    const total = burn + referral + treasury;
    expect(Math.abs(total - COST)).toBeLessThanOrEqual(1);

    expect(burn).toBeGreaterThan(0);
    expect(burn / COST).toBeGreaterThanOrEqual(0.75);
    expect(burn / COST).toBeLessThanOrEqual(0.85);

    if (referral > 0) {
      const referralPct = referral / COST;
      expect(referralPct).toBeGreaterThanOrEqual(0.05);
      expect(referralPct).toBeLessThanOrEqual(0.2);
    } else {
      expect(referral).toBe(0);
    }

    const treasuryPct = treasury / COST;
    expect(treasuryPct).toBeGreaterThanOrEqual(0.05);
    expect(treasuryPct).toBeLessThanOrEqual(0.2);

    expect(typeof response.json?.newBalance).toBe('number');
  });
});

```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src", "tests"]
}

```

## vitest.config.ts

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { dir: "tests", globals: true, testTimeout: 120_000, sequence: { shuffle: false } }
});

```


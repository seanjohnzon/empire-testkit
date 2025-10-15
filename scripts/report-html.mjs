import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const vitestJsonPath = path.join(repoRoot, '.vitest-reports', 'json.json');
const reqmapPathJs = path.join(repoRoot, 'tests', 'reqmap.js');
const outDir = path.join(repoRoot, 'reports');
const assetsDir = path.join(outDir, 'assets');

fs.mkdirSync(assetsDir, { recursive: true });

// Load vitest JSON
const vitest = JSON.parse(fs.readFileSync(vitestJsonPath, 'utf8'));

// Load requirement map (ESM)
const { REQ_MAP } = await import(pathToFileUrl(reqmapPathJs));
function pathToFileUrl(p){ const {URL}=globalThis; return new URL('file://' + p).href; }

// Flatten test results
const tests = [];
for (const suite of vitest.testResults ?? []) {
  for (const tc of suite.assertionResults ?? []) {
    tests.push({
      file: suite.name,
      title: tc.title || tc.fullName || '',
      fullName: tc.fullName || tc.title || '',
      status: tc.status, // 'passed' | 'failed' | 'skipped' etc
      duration: tc.duration ?? 0
    });
  }
}

// Map tests -> requirements via substring match of the title
const reqCoverage = {}; // REQ-XXX -> { total, passed, failed, tests[] }
function ensureReq(id){ reqCoverage[id] ??= { total:0, passed:0, failed:0, tests:[] }; return reqCoverage[id]; }

for (const t of tests) {
  // find all REQ ids whose key substring is in test title
  for (const [key, ids] of Object.entries(REQ_MAP)) {
    if (t.fullName.includes(key)) {
      for (const id of ids) {
        const bucket = ensureReq(id);
        bucket.total++;
        if (t.status === 'passed') bucket.passed++; else if (t.status === 'failed') bucket.failed++;
        bucket.tests.push(t);
      }
    }
  }
}

// Totals
const totals = {
  total: tests.length,
  passed: tests.filter(t=>t.status==='passed').length,
  failed: tests.filter(t=>t.status==='failed').length,
  skipped: tests.filter(t=>t.status==='skipped').length
};

// Simple CSS
const css = `:root{--bg:#0b0f14;--card:#121821;--muted:#a3b0c2;--ok:#16c172;--bad:#ff5d5d;--warn:#ffcc66;--ink:#e6eef8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial}
.wrap{max-width:1100px;margin:40px auto;padding:0 16px}
h1{font-size:26px;margin:0 0 10px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card{background:var(--card);border:1px solid #1d2633;border-radius:12px;padding:14px;box-shadow:0 1px 0 rgba(255,255,255,0.04) inset}
.kv{display:flex;gap:10px;flex-wrap:wrap}
.kv div{background:#0f1420;border:1px solid #1c2431;border-radius:8px;padding:8px 10px}
.kv .ok{color:var(--ok)} .kv .bad{color:var(--bad)} .kv .warn{color:var(--warn)}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{padding:8px 10px;border-bottom:1px solid #1e2736}
th{color:#9db0c9;text-align:left;font-weight:600}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #273248;color:#cfe2ff;background:#0e1420}
.status-pass{color:var(--ok)} .status-fail{color:var(--bad)} .status-skip{color:var(--warn)}
.req{font-weight:700}
.small{color:var(--muted);font-size:12px}
a{color:#a7d1ff;text-decoration:none} a:hover{text-decoration:underline}
.figure{display:flex;gap:16px;align-items:center}
.chart{width:120px;height:120px}
`;

fs.writeFileSync(path.join(assetsDir,'style.css'), css, 'utf8');

function pct(x, d=1){ if(!totals.total) return '0%'; return ((x/totals.total)*100).toFixed(d)+'%'; }

// Tiny donut chart (inline SVG)
function donut(pass, fail, skip){
  const sum = pass+fail+skip || 1;
  const p = pass/sum*100, f = fail/sum*100, s = skip/sum*100;
  const arc = (val,off,color)=>`<circle r="18" cx="20" cy="20" stroke="${color}" stroke-width="8" fill="transparent" stroke-dasharray="${val} ${100-val}" transform="rotate(-90 20 20)" stroke-dashoffset="${off}"/>`;
  return `<svg class="chart" viewBox="0 0 40 40">${arc(100,0,'#1f2a3a')}${arc(p,0,'#16c172')}${arc(f,-p,'#ff5d5d')}${arc(s,-p-f,'#ffcc66')}</svg>`;
}

const byReq = Object.entries(reqCoverage).sort((a,b)=>a[0].localeCompare(b[0]));
const requirementsRows = byReq.map(([id,info])=>{
  const badge = info.failed>0 ? 'status-fail' : (info.passed>0 ? 'status-pass' : 'status-skip');
  return `<tr>
    <td class="req">${id}</td>
    <td>${info.passed}/${info.total}</td>
    <td class="${badge}">${info.failed>0?'Failing':(info.passed>0?'Passing':'Uncovered')}</td>
  </tr>`;
}).join('') || `<tr><td colspan="3" class="small">No requirements matched from REQ_MAP.</td></tr>`;

const failingTests = tests.filter(t=>t.status==='failed');
const failingRows = failingTests.map(t=>`<tr><td>${t.title}</td><td><span class="badge">${t.file}</span></td><td class="status-fail">failed</td></tr>`).join('')
  || `<tr><td colspan="3" class="small">No failing tests.</td></tr>`;

const allRows = tests.map(t=>{
  const cls = t.status==='passed'?'status-pass':(t.status==='failed'?'status-fail':'status-skip');
  return `<tr><td>${t.title}</td><td><span class="badge">${t.file}</span></td><td class="${cls}">${t.status}</td></tr>`;
}).join('');

const html = `<!doctype html>
<meta charset="utf-8">
<title>Empire Testkit — Test Report</title>
<link rel="stylesheet" href="./assets/style.css">
<div class="wrap">
  <h1>Empire Testkit — Test Report</h1>
  <div class="grid">
    <div class="card">
      <div class="figure">
        ${donut(totals.passed, totals.failed, totals.skipped)}
        <div>
          <div class="kv">
            <div class="ok">Passed: ${totals.passed} (${pct(totals.passed)})</div>
            <div class="bad">Failed: ${totals.failed} (${pct(totals.failed)})</div>
            <div class="warn">Skipped: ${totals.skipped} (${pct(totals.skipped)})</div>
          </div>
          <div class="small">Total tests: ${totals.total}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <strong>Artifacts</strong>
      <div class="small">Raw Vitest JSON: <code>.vitest-reports/json.json</code></div>
      <div class="small">Requirement map: <code>tests/reqmap.js</code></div>
    </div>
  </div>

  <div class="grid" style="margin-top:14px">
    <div class="card">
      <strong>Requirement Coverage</strong>
      <table>
        <thead><tr><th>Requirement</th><th>Covered</th><th>Status</th></tr></thead>
        <tbody>${requirementsRows}</tbody>
      </table>
    </div>
    <div class="card">
      <strong>Failing Tests</strong>
      <table>
        <thead><tr><th>Test</th><th>File</th><th>Status</th></tr></thead>
        <tbody>${failingRows}</tbody>
      </table>
    </div>
  </div>

  <div class="card" style="margin-top:14px">
    <strong>All Tests</strong>
    <table>
      <thead><tr><th>Test</th><th>File</th><th>Status</th></tr></thead>
      <tbody>${allRows}</tbody>
    </table>
  </div>
</div>
`;

fs.writeFileSync(path.join(outDir,'index.html'), html, 'utf8');
console.log('HTML report written to reports/index.html');

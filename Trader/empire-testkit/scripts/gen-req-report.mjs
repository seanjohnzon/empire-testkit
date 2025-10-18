import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();

function safeRead(p, def = '') {
  try { return fs.readFileSync(p, 'utf8'); } catch { return def; }
}

// Optional: REQ mapping (TS or JS); we'll try both, else fallback.
let reqMap = {};
try {
  const tsPath = path.join(ROOT, 'tests/reqmap.ts');
  const jsPath = path.join(ROOT, 'tests/reqmap.js');
  if (fs.existsSync(jsPath)) {
    reqMap = JSON.parse(safeRead(jsPath, '{}'));
  } else if (fs.existsSync(tsPath)) {
    // Very simple parse: expect export default { "REQ-xxx": "desc", ... }
    const raw = safeRead(tsPath);
    const match = raw.match(/\{[\s\S]*\}/m);
    if (match) {
      // Unsafe eval avoided; rudimentary conversion:
      const jsonish = match[0]
        .replace(/(\w+)\s*:/g, '"$1":')  // keys to strings
        .replace(/'/g, '"');             // single to double
      reqMap = JSON.parse(jsonish);
    }
  }
} catch {}

const jsonPath = path.join(ROOT, '.vitest-reports', 'json.json');
const raw = safeRead(jsonPath, '{}');
let report = {};
try { report = JSON.parse(raw); } catch { report = {}; }

const outPath = path.join(ROOT, 'reports', 'requirements.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

function collectTests(rep) {
  const items = [];
  (rep?.testResults || rep?.tests || []).forEach(suite => {
    const tests = suite?.assertionResults || suite?.tests || [];
    tests.forEach(t => {
      items.push({
        fullName: t.fullName || `${suite.name} :: ${t.title}`,
        status: t.status || (t?.error ? 'failed' : 'passed'),
        duration: t.duration || 0,
      });
    });
  });
  return items;
}

const items = collectTests(report);
const total = items.length;
const passed = items.filter(i => i.status === 'passed').length;
const failed = total - passed;

let md = `# Requirements Coverage\n\n`;
md += `- Total: **${total}**  |  Passed: **${passed}**  |  Failed: **${failed}**\n\n`;

if (Object.keys(reqMap).length) {
  md += `## REQ Map\n\n`;
  for (const [k, v] of Object.entries(reqMap)) {
    md += `- **${k}**: ${v}\n`;
  }
  md += `\n`;
}

md += `## Test Scenarios\n\n`;
items.forEach((i, idx) => {
  md += `- ${idx+1}. ${i.fullName} — ${i.status} (${i.duration}ms)\n`;
});

fs.writeFileSync(outPath, md, 'utf8');
console.log('Wrote', outPath);

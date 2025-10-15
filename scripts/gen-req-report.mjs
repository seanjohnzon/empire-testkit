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

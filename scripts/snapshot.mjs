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

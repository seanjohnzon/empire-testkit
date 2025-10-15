import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'reports', 'source-snapshot.md');
const ignore = new Set([
const outDir = path.join(root, '.snapshot');
const filesDir = path.join(outDir, 'files');

const IGNORE = new Set([
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
  'coverage',
  'dist',
  'build',
  '.next',
  '.cache',
  'reports',
  'tmp',
  '.DS_Store',
  '.snapshot'
]);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(filesDir, { recursive: true });

function walk(relPath = '') {
  const absPath = path.join(root, relPath);
  const entries = fs.readdirSync(absPath, { withFileTypes: true });
  const children = [];
  for (const entry of entries) {
    const name = entry.name;
    if (IGNORE.has(name)) continue;
    const entryRel = relPath ? path.join(relPath, name) : name;
    const entryAbs = path.join(root, entryRel);
    if (entry.isDirectory()) {
      const child = walk(entryRel);
      if (child.children.length > 0) {
        children.push({ type: 'dir', name, rel: entryRel, children: child.children });
      } else {
        children.push({ type: 'dir', name, rel: entryRel, children: [] });
      }
    } else if (entry.isFile()) {
      if (IGNORE.has(name)) continue;
      const destPath = path.join(filesDir, entryRel) + '.txt';
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const content = fs.readFileSync(entryAbs, 'utf8');
      fs.writeFileSync(destPath, content, 'utf8');
      children.push({ type: 'file', name, rel: entryRel });
    }
  }
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { type: 'dir', name: relPath, rel: relPath, children };
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
}

function toLink(rel) {
  const segments = rel.split(path.sep).map((seg) => encodeURIComponent(seg));
  return `files/${segments.join('/')}.txt`;
}

function render(nodes) {
  if (!nodes.length) return '';
  const items = nodes.map((node) => {
    if (node.type === 'dir') {
      const childrenHtml = render(node.children);
      return `<li><details open><summary>${escapeHtml(node.name)}/</summary>${childrenHtml}</details></li>`;
    }
    const link = toLink(node.rel).replace(/\\/g, '/');
    return `<li><a href="${link}">${escapeHtml(node.name)}</a></li>`;
  });
  return `<ul>${items.join('')}</ul>`;
}

const tree = walk('');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Empire Testkit Snapshot</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
    details > summary { cursor: pointer; }
    ul { list-style: none; padding-left: 1rem; }
    li { margin: 0.25rem 0; }
  </style>
</head>
<body>
  <h1>Empire Testkit Snapshot</h1>
  ${render(tree.children)}
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), `${html}\n`, 'utf8');
console.log('Snapshot created at', outDir);

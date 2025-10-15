import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '.snapshot');
const filesDir = path.join(outDir, 'files');

const IGNORE = new Set([
  'node_modules',
  '.git',
  '.github',
  '.vitest-reports',
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

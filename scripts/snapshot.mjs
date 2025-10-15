import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '.snapshot');
const filesDir = path.join(outDir, 'files');

const IGNORE = new Set([
  'node_modules', '.git', '.github', '.vitest-reports',
  'dist', 'build', 'coverage', '.next', '.cache',
  'reports', 'tmp', '.DS_Store', '.snapshot'
]);

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
      children.push({ type: 'dir', name, rel: entryRel, children: child.children });
    } else if (entry.isFile()) {
      const destPath = path.join(filesDir, entryRel) + '.txt';
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const content = fs.readFileSync(entryAbs, 'utf8');
      fs.writeFileSync(destPath, content, 'utf8');
      children.push({ type: 'file', name, rel: entryRel });
    }
  }
  children.sort((a, b) => (a.type === b.type) ? a.name.localeCompare(b.name) : (a.type === 'dir' ? -1 : 1));
  return { type: 'dir', name: relPath || '', rel: relPath || '', children };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toLink(rel) {
  const segs = rel.split(path.sep).map(encodeURIComponent);
  return `files/${segs.join('/')}.txt`;
}
function render(nodes) {
  if (!nodes.length) return '';
  const items = nodes.map(node => {
    if (node.type === 'dir') {
      return `<li><details open><summary>${escapeHtml(node.name)}/</summary>${render(node.children)}</details></li>`;
    }
    return `<li><a href="${toLink(node.rel).replace(/\\/g,'/')}">${escapeHtml(node.name)}</a></li>`;
  });
  return `<ul>${items.join('')}</ul>`;
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(filesDir, { recursive: true });

const tree = walk('');
const html = `<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8" />
<title>Empire Testkit Snapshot</title>
<style>body{font-family:sans-serif;padding:2rem}details>summary{cursor:pointer}ul{list-style:none;padding-left:1rem}li{margin:.25rem 0}</style>
<h1>Empire Testkit Snapshot</h1>
${render(tree.children)}
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('Snapshot created at', outDir);

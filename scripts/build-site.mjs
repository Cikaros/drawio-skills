#!/usr/bin/env node
// Zero-dependency static site: Markdown -> HTML under site/.
//   node scripts/build-site.mjs --write
//   node scripts/build-site.mjs --check
//
// The renderer supports the subset this repository uses: headings, paragraphs,
// fenced code, lists, tables, blockquotes, rules, inline code/bold/italic/links.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'site');
const check = process.argv.includes('--check');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'site', '.probe'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const pageFiles = walk(root)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => {
    const rel = path.relative(root, file).split(path.sep).join('/');
    return rel === 'README.md' || /^(docs|skills|verification)\//.test(rel) || ['CONTRIBUTING.md', 'CHANGELOG.md'].includes(rel);
  })
  .sort();

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (whole, label, href) => {
    const target = href.replace(/\.md(#|$)/, '.html$1');
    const external = /^[a-z]+:/i.test(target);
    return `<a href="${external ? target : target}"${external ? ' rel="noreferrer"' : ''}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

function renderTable(lines) {
  const rows = lines.map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
  const header = rows[0];
  const body = rows.slice(2);
  return `<table><thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderMarkdown(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      i += 1;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i += 1;
      out.push(`<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (!line.trim()) { i += 1; continue; }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const table = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) table.push(lines[i++]);
      out.push(renderTable(table));
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^---+$/.test(line.trim())) { out.push('<hr>'); i += 1; continue; }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }
    if (/^[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^[-*+]\s+/, ''));
      out.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+[.)]\s+/, ''));
      out.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      continue;
    }
    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*\|.*\||[-*+]\s|\d+[.)]\s|---+$)/.test(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return out.join('\n');
}

function titleOf(markdown, fallback) {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match ? match[1].trim() : fallback;
}

const nav = pageFiles.map((file) => {
  const rel = path.relative(root, file).split(path.sep).join('/');
  return { rel, html: rel.replace(/\.md$/, '.html'), title: titleOf(fs.readFileSync(file, 'utf8'), rel) };
});

const pages = new Map();
for (const file of pageFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const markdown = fs.readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  const title = titleOf(markdown, rel);
  const prefix = rel.includes('/') ? '../'.repeat(rel.split('/').length - 1) : '';
  const body = renderMarkdown(markdown);
  const navHtml = nav.map((item) => `<a href="${prefix}${item.html}"${item.rel === rel ? ' class="active"' : ''}>${escapeHtml(item.title)}</a>`).join('');
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · drawio-skills</title>
<style>
:root{--bg:#fff;--fg:#1b1f24;--muted:#5a626e;--line:#e3e7ee;--accent:#2563eb;--code:#f6f8fb}
*{box-sizing:border-box}
body{margin:0;font:15px/1.7 -apple-system,"Segoe UI","Microsoft YaHei",Helvetica,Arial,sans-serif;color:var(--fg);background:var(--bg)}
.layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh}
nav{border-right:1px solid var(--line);padding:24px 16px;position:sticky;top:0;height:100vh;overflow:auto;background:#fbfcfe}
nav .brand{font-weight:700;font-size:16px;margin-bottom:4px}
nav .sub{color:var(--muted);font-size:12px;margin-bottom:16px}
nav a{display:block;padding:6px 8px;color:var(--muted);text-decoration:none;border-radius:6px;font-size:13px}
nav a:hover{background:#eef2f8;color:var(--fg)}
nav a.active{background:#e8f0ff;color:var(--accent);font-weight:600}
main{padding:40px 48px 80px;max-width:960px}
h1{font-size:28px;line-height:1.3;margin:0 0 20px}
h2{font-size:20px;margin:34px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--line)}
h3{font-size:16px;margin:24px 0 8px}
p,li{color:var(--fg)}
code{background:var(--code);padding:1px 5px;border-radius:4px;font-family:ui-monospace,Consolas,monospace;font-size:13px}
pre{background:var(--code);border:1px solid var(--line);border-radius:8px;padding:14px;overflow:auto}
pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;margin:16px 0;font-size:13px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{background:#f7f9fc}
blockquote{margin:16px 0;padding:8px 16px;border-left:3px solid #c9d6ea;color:var(--muted);background:#fafbfd}
hr{border:0;border-top:1px solid var(--line);margin:28px 0}
a{color:var(--accent)}
footer{margin-top:48px;color:var(--muted);font-size:12px}
@media (max-width:860px){.layout{grid-template-columns:1fr}nav{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}main{padding:24px}}
</style>
</head>
<body>
<div class="layout">
<nav>
<div class="brand">drawio-skills</div>
<div class="sub">MCP 规范 · 制图规范 · 可执行技能</div>
${navHtml}
</nav>
<main>
${body}
<footer>由 <code>scripts/build-site.mjs</code> 生成 · 零依赖</footer>
</main>
</div>
</body>
</html>
`;
  pages.set(rel.replace(/\.md$/, '.html'), html);
}

pages.set('index.html', `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=README.html"><title>drawio-skills</title></head><body><p><a href="README.html">drawio-skills</a></p></body></html>`);

const problems = [];
for (const [page, html] of pages) {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  const dir = path.posix.dirname(page);
  for (const href of hrefs) {
    if (/^[a-z]+:/i.test(href) || href.startsWith('#')) continue;
    const resolved = path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, href.split('#')[0]));
    if (!pages.has(resolved) && !fs.existsSync(path.join(root, resolved))) {
      problems.push(`${page}: broken internal link -> ${href}`);
    }
  }
}

if (check) {
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`site:check OK (${pages.size} page(s), no broken internal links)`);
} else {
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const [page, html] of pages) {
    const target = path.join(outDir, page);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  }
  console.log(`site: ${pages.size} page(s) written to site/`);
  if (problems.length) console.warn(`warnings:\n${problems.join('\n')}`);
}

#!/usr/bin/env node
// Static checks for the repository itself:
//   - relative Markdown links resolve
//   - code fences are balanced
//   - every Markdown file has exactly one H1 and no level jumps
//   - skill frontmatter carries only name/description and matches its folder
//   - examples referenced by docs exist
//   - every .drawio under examples/ passes the linter (strict)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintFile } from '../shared/drawio-lint.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'site' || entry.name === '.probe' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const allFiles = walk(root);
const mdFiles = allFiles.filter((file) => file.endsWith('.md'));
const rel = (file) => path.relative(root, file).split(path.sep).join('/');

for (const file of mdFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const name = rel(file);
  const lines = text.split(/\r?\n/);

  let h1 = 0;
  let inFenceForH1 = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) { inFenceForH1 = !inFenceForH1; continue; }
    if (!inFenceForH1 && /^# /.test(line)) h1 += 1;
  }
  if (!(lines.length && lines[0].trim() === '---' && name.startsWith('skills/'))) {
    if (h1 !== 1) problems.push(`${name}: expected exactly one H1 outside code fences, found ${h1}`);
  }

  let previousLevel = 0;
  let inFence = false;
  let fences = 0;
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      fences += 1;
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = /^(#{1,6})\s+/.exec(line);
    if (!heading) continue;
    const level = heading[1].length;
    if (previousLevel && level > previousLevel + 1) {
      problems.push(`${name}: heading jumps from H${previousLevel} to H${level}: ${line.trim()}`);
    }
    previousLevel = level;
  }
  if (fences % 2 !== 0) problems.push(`${name}: unbalanced code fence (${fences} markers)`);

  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(text))) {
    const target = match[1].trim();
    if (!target || target.startsWith('#') || /^[a-z]+:/i.test(target)) continue;
    const clean = decodeURI(target.split('#')[0]);
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(resolved)) problems.push(`${name}: broken link "${target}"`);
  }
}

// Skill frontmatter rules.
const skillsDir = path.join(root, 'skills');
for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    problems.push(`skills/${entry.name}: missing SKILL.md`);
    continue;
  }
  const text = fs.readFileSync(skillFile, 'utf8');
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!front) {
    problems.push(`skills/${entry.name}/SKILL.md: missing frontmatter`);
    continue;
  }
  const keys = front[1].split(/\r?\n/).filter(Boolean).map((line) => line.split(':')[0].trim());
  const unexpected = keys.filter((key) => !['name', 'description'].includes(key));
  if (unexpected.length) problems.push(`skills/${entry.name}/SKILL.md: unexpected frontmatter keys: ${unexpected.join(', ')}`);
  const nameMatch = /^name:\s*(.+)$/m.exec(front[1]);
  if (!nameMatch) problems.push(`skills/${entry.name}/SKILL.md: frontmatter has no name`);
  else if (nameMatch[1].trim() !== entry.name) problems.push(`skills/${entry.name}/SKILL.md: name "${nameMatch[1].trim()}" does not match folder`);
  const descMatch = /^description:\s*(.+)$/m.exec(front[1]);
  if (!descMatch || descMatch[1].trim().length < 40) problems.push(`skills/${entry.name}/SKILL.md: description is missing or too short to trigger reliably`);
}

// Examples must stay lint-clean.
const examplesDir = path.join(root, 'examples');
if (fs.existsSync(examplesDir)) {
  for (const file of fs.readdirSync(examplesDir).filter((name) => name.endsWith('.drawio'))) {
    const full = path.join(examplesDir, file);
    const result = lintFile(fs.readFileSync(full, 'utf8'));
    for (const issue of result.issues) {
      if (issue.severity === 'error') problems.push(`examples/${file}: ${issue.code} ${issue.message}`);
    }
  }
}

if (problems.length) {
  console.error(`check-docs: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`check-docs: ${mdFiles.length} Markdown file(s), skills and examples OK`);

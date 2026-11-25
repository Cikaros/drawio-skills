#!/usr/bin/env node
// Validate draw.io files without a browser.
//   node scripts/validate-drawio.mjs examples/*.drawio
//   node scripts/validate-drawio.mjs --strict path/to/file.drawio
//   node scripts/validate-drawio.mjs --json path/to/file.drawio
//
// Exit codes: 0 clean, 1 errors (or warnings with --strict), 2 no files matched.

import fs from 'node:fs';
import path from 'node:path';
import { formatIssues, lintFile } from './lib/drawio-lint.mjs';

function expand(pattern) {
  if (!/[*?]/.test(pattern)) return fs.existsSync(pattern) ? [pattern] : [];
  const dir = path.dirname(pattern) || '.';
  const base = path.basename(pattern);
  if (!fs.existsSync(dir)) return [];
  const matcher = new RegExp(`^${base.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  return fs.readdirSync(dir)
    .filter((name) => matcher.test(name))
    .map((name) => path.join(dir, name));
}

const args = process.argv.slice(2);
const json = args.includes('--json');
const strict = args.includes('--strict');
const quiet = args.includes('--quiet');
const patterns = args.filter((arg) => !arg.startsWith('--'));

const files = [...new Set(patterns.flatMap(expand))].sort();
if (!files.length) {
  console.error(`No files matched: ${patterns.join(' ') || '(nothing)'}`);
  process.exit(2);
}

let errorCount = 0;
let warnCount = 0;
const report = [];

for (const file of files) {
  const xml = fs.readFileSync(file, 'utf8');
  const result = lintFile(xml);
  const errors = result.issues.filter((issue) => issue.severity === 'error').length;
  const warns = result.issues.filter((issue) => issue.severity === 'warn').length;
  errorCount += errors;
  warnCount += warns;
  report.push({
    file,
    kind: result.kind,
    pages: result.pages.length,
    errors,
    warnings: warns,
    issues: result.issues
  });
  if (!quiet && !json) console.log(formatIssues(result, file));
}

if (json) {
  console.log(JSON.stringify({ files: report, errors: errorCount, warnings: warnCount }, null, 2));
} else if (!quiet) {
  console.log(`\n${files.length} file(s): ${errorCount} error(s), ${warnCount} warning(s)`);
  if (errorCount === 0) {
    console.log('Preview is still required for visual claims: run open_drawio_xml or open the file in draw.io.');
  }
}

process.exit(errorCount > 0 || (strict && warnCount > 0) ? 1 : 0);

#!/usr/bin/env node
// Probe: every shipped example must stay lint-clean, including warnings.
// Fails the process when an example drifts, so the docs cannot silently rot.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintFile } from '../../shared/drawio-lint.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'examples');
const files = fs.readdirSync(dir).filter((name) => name.endsWith('.drawio')).sort();

let errors = 0;
let warnings = 0;
for (const file of files) {
  const result = lintFile(fs.readFileSync(path.join(dir, file), 'utf8'));
  const e = result.issues.filter((issue) => issue.severity === 'error').length;
  const w = result.issues.filter((issue) => issue.severity === 'warn').length;
  errors += e;
  warnings += w;
  console.log(`${file.padEnd(36)} pages=${result.pages.length}  errors=${e}  warnings=${w}`);
  for (const issue of result.issues) {
    console.log(`  ${issue.severity.padEnd(5)} ${issue.code} ${issue.message}`);
  }
}

console.log(`\nexamples: ${files.length}, errors=${errors}, warnings=${warnings}`);
process.exit(errors || warnings ? 1 : 0);

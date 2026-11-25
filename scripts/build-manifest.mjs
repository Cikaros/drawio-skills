#!/usr/bin/env node
// Build or verify skills/<name>/manifest.json (file list + SHA-256).
//   node scripts/build-manifest.mjs           # write
//   node scripts/build-manifest.mjs --check   # verify, exit 1 on drift
//
// The manifest is deterministic: no timestamps, sorted paths.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(root, 'skills');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const check = process.argv.includes('--check');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function relative(dir, file) {
  return path.relative(dir, file).split(path.sep).join('/');
}

// Git stores text with LF, but a Windows checkout may hand us CRLF. Hash the
// normalised text so the manifest is identical on every platform and CI does
// not report a false drift. Binary files are left untouched.
function normaliseText(buffer) {
  if (buffer.includes(0)) return buffer;
  return Buffer.from(buffer.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

let drift = 0;
const skillNames = fs.readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of skillNames) {
  const dir = path.join(skillsDir, name);
  const manifestPath = path.join(dir, 'manifest.json');
  const files = walk(dir)
    .filter((file) => file !== manifestPath)
    .sort()
    .map((file) => {
      const buffer = normaliseText(fs.readFileSync(file));
      return {
        path: relative(dir, file),
        bytes: buffer.length,
        sha256: crypto.createHash('sha256').update(buffer).digest('hex')
      };
    });

  const manifest = {
    name,
    version: pkg.version,
    files
  };
  const next = `${JSON.stringify(manifest, null, 2)}\n`;
  const previous = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';

  if (check) {
    if (previous !== next) {
      drift += 1;
      console.error(`manifest drift: skills/${name}/manifest.json (run: npm run manifest)`);
    }
  } else {
    fs.writeFileSync(manifestPath, next);
    console.log(`wrote skills/${name}/manifest.json (${files.length} files)`);
  }
}

if (check) {
  if (drift) process.exit(1);
  console.log(`manifests up to date (${skillNames.length} skill(s))`);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(root, 'skills', 'drawio-mcp');
const skillFile = (rel) => path.join(skillDir, rel);

test('installable skill is self-contained and its manifest covers the validator', () => {
  const required = [
    'SKILL.md',
    'scripts/validate-drawio.mjs',
    'scripts/lib/drawio-lint.mjs',
    'scripts/lib/drawio-file.mjs',
    'scripts/lib/text-metrics.mjs',
    'scripts/lib/xml-parse.mjs'
  ];
  const manifest = JSON.parse(fs.readFileSync(skillFile('manifest.json'), 'utf8'));
  const listed = new Set(manifest.files.map((entry) => entry.path));
  for (const rel of required) {
    assert.ok(fs.existsSync(skillFile(rel)), `missing skill file: ${rel}`);
    assert.ok(listed.has(rel), `manifest does not list: ${rel}`);
  }
  const validator = fs.readFileSync(skillFile('scripts/validate-drawio.mjs'), 'utf8');
  assert.ok(validator.includes("from './lib/drawio-lint.mjs'"), 'validator must use the skill-local library');
  assert.ok(!validator.includes('../shared/'), 'validator must not depend on the repository root');
});

test('skill validator runs with the skill directory as cwd', () => {
  const sample = path.join(root, 'examples', '01-approval-flow.drawio');
  const result = spawnSync(process.execPath, ['scripts/validate-drawio.mjs', '--strict', sample], {
    cwd: skillDir,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /0 error\(s\), 0 warning\(s\)/);
});

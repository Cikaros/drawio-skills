import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintFile } from '../shared/drawio-lint.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('scenario matrix covers every phase with unique ids', () => {
  const text = read('skills/drawio-mcp/references/scenarios.md');
  const ids = [...text.matchAll(/^\|\s*([A-I]\d{1,2})\s*\|/gm)].map((match) => match[1]);
  assert.ok(ids.length >= 60, `expected at least 60 scenarios, found ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length, 'scenario ids must be unique');
  for (const group of 'ABCDEFGHI') {
    assert.ok(ids.some((id) => id.startsWith(group)), `group ${group} has no scenario`);
  }
});

test('shape library reference keeps the three tiers and the no-guess rule', () => {
  const text = read('skills/drawio-mcp/references/shape-libraries.md');
  for (const token of [
    'Tier A',
    'Tier B',
    'Tier C',
    'search_shapes',
    'shape=cylinder3',
    'shape=umlLifeline',
    'shape=mxgraph.flowchart.document',
    '禁止手写猜名'
  ]) {
    assert.ok(text.includes(token), `missing token: ${token}`);
  }
});

test('the smoke test example stays lint-clean and covers the Tier B set', () => {
  const xml = read('examples/06-shape-smoke-test.drawio');
  const result = lintFile(xml);
  const errors = result.issues.filter((issue) => issue.severity === 'error');
  assert.deepEqual(errors, []);
  const shapes = (xml.match(/shape=/g) ?? []).length;
  assert.ok(shapes >= 30, `expected at least 30 shape styles, found ${shapes}`);
  assert.ok(xml.includes('汇合（B，退化）'), 'summingJunction must be labeled as a regression control');
  assert.ok(xml.includes('链环（B，退化）'), 'link must be labeled as a regression control');
});

test('the Tier C icon example is lint-clean and keeps exact search_shapes styles', () => {
  const xml = read('examples/08-tier-c-icons.drawio');
  const result = lintFile(xml);
  assert.deepEqual(result.issues, []);
  for (const token of [
    'mxgraph.aws4.bucket',
    'mxgraph.kubernetes.icon2',
    'mxgraph.bpmn.gateway2',
    'mxgraph.pid2valves.valve',
    'mxgraph.electrical.resistors.attenuator',
    'mxgraph.gcp3.bigquery',
    'mxgraph.cisco.routers.10700',
    'image=https://app.diagrams.net/'
  ]) {
    assert.ok(xml.includes(token), `missing Tier C style token: ${token}`);
  }
  const icons = (xml.match(/id="icon-/g) ?? []).length;
  assert.ok(icons >= 8, `expected at least 8 Tier C icons, found ${icons}`);
});

test('SKILL.md points at the selection references', () => {
  const text = read('skills/drawio-mcp/SKILL.md');
  assert.ok(text.includes('references/scenarios.md'));
  assert.ok(text.includes('references/shape-libraries.md'));
  assert.ok(text.includes('references/sequences.md'));
  assert.ok(text.includes('examples/06-shape-smoke-test.drawio'));
  assert.ok(text.includes('EDGE005'));
  assert.ok(text.includes('EDGE006'));
  assert.ok(text.includes('TEXT001'));
});

test('sequence reference keeps the anchoring rules', () => {
  const text = read('skills/drawio-mcp/references/sequences.md');
  for (const token of ['shape=umlLifeline', 'exitY', 'entryY', 'labelBackgroundColor', 'dashed=1', 'examples/07-sequence-lifelines.drawio']) {
    assert.ok(text.includes(token), `missing token: ${token}`);
  }
});

test('sequence example stays lint-clean', () => {
  const result = lintFile(read('examples/07-sequence-lifelines.drawio'));
  assert.deepEqual(result.issues, []);
});

test('scenarios include the real-project atlas workflow', () => {
  const text = read('skills/drawio-mcp/references/scenarios.md');
  assert.ok(text.includes('真实项目图集'));
  assert.ok(text.includes('视觉抽检'));
  assert.ok(text.includes('README.md'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMxfile, decodeDiagramText, encodeDiagramText, listPages, parseDrawioFile } from '../shared/drawio-file.mjs';

const MODEL = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="a" value="A" style="rounded=1;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="140" height="60" as="geometry"/></mxCell></root></mxGraphModel>';

test('compressed payload round-trips through deflateRaw + uri encoding', () => {
  const payload = encodeDiagramText(MODEL);
  assert.ok(!payload.includes('<'), 'payload must not contain raw markup');
  const decoded = decodeDiagramText(payload);
  assert.equal(decoded.error, null);
  assert.equal(decoded.xml, MODEL);
});

test('decoding tolerates a payload that is not URI-encoded', () => {
  const { xml } = decodeDiagramText(encodeDiagramText(MODEL).replace(/%3D/g, '='));
  assert.equal(xml, MODEL);
});

test('decoding reports garbage instead of returning empty XML', () => {
  const result = decodeDiagramText('not-a-real-payload');
  assert.equal(result.xml, null);
  assert.match(result.error, /base64|compressed/);
});

test('parseDrawioFile reads inline and compressed pages of the same file', () => {
  const file = `<mxfile><diagram id="p1" name="Inline">${MODEL}</diagram><diagram id="p2" name="Packed">${encodeDiagramText(MODEL)}</diagram></mxfile>`;
  const parsed = parseDrawioFile(file);
  assert.equal(parsed.kind, 'mxfile');
  assert.equal(parsed.pages.length, 2);
  assert.equal(parsed.pages[0].compressed, false);
  assert.equal(parsed.pages[1].compressed, true);
  assert.equal(parsed.pages[1].model.name, 'mxGraphModel');
  assert.equal(parsed.errors.length, 0);
});

test('a bare mxGraphModel is a valid single-page document', () => {
  const parsed = parseDrawioFile(MODEL);
  assert.equal(parsed.kind, 'model');
  assert.equal(parsed.pages.length, 1);
});

test('listPages returns index/id/name and a vertex count', () => {
  const summary = listPages(buildMxfile([{ name: 'One', modelXml: MODEL }, { name: 'Two', modelXml: MODEL }]));
  assert.equal(summary.pages.length, 2);
  assert.deepEqual(summary.pages.map((page) => page.name), ['One', 'Two']);
  assert.equal(summary.pages[0].vertices, 1);
});

test('buildMxfile produces a document the parser accepts', () => {
  const file = buildMxfile([{ name: 'Flow / Main', modelXml: MODEL }]);
  const parsed = parseDrawioFile(file);
  assert.equal(parsed.kind, 'mxfile');
  assert.equal(parsed.pages[0].name, 'Flow / Main');
  assert.deepEqual(parsed.errors, []);
});

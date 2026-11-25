import test from 'node:test';
import assert from 'node:assert/strict';
import { EDGE_STYLES, GRID, ROLE_COLORS, edgeXml, estimateTextWidth, fitBox, fitLabel, label, roleStyle, safeName, wrapText } from '../shared/drawio-guards.mjs';

test('the grid is the documented 180×120 rhythm', () => {
  assert.equal(GRID.col(0), 40);
  assert.equal(GRID.col(3), 580);
  assert.equal(GRID.row(0), 40);
  assert.equal(GRID.row(2), 280);
});

test('role styles carry fill, stroke, font colour and html=1', () => {
  const style = roleStyle('decision');
  assert.match(style, /fillColor=#FFF6E0/);
  assert.match(style, /strokeColor=#E8C36A/);
  assert.match(style, /html=1/);
  assert.match(style, /fontColor=#1B1F24/);
});

test('every role has a colour pair', () => {
  for (const [role, colors] of Object.entries(ROLE_COLORS)) {
    assert.match(colors.fill, /^#[0-9A-F]{6}$/i, role);
    assert.match(colors.stroke, /^#[0-9A-F]{6}$/i, role);
  }
});

test('labels escape markup and use <br> for newlines', () => {
  assert.equal(label(['a & b', 'c']), 'a &amp; b<br>c');
  assert.equal(label('x<y'), 'x&lt;y');
});

test('edge XML always carries relative geometry', () => {
  const xml = edgeXml({ id: 'e1', source: 'a', target: 'b', label: 'Yes' });
  assert.match(xml, /<mxGeometry relative="1" as="geometry"\/>/);
  assert.match(xml, /source="a"/);
  assert.match(xml, /value="Yes"/);
  assert.match(xml, /labelBackgroundColor/);
});

test('edge style presets include label backgrounds', () => {
  for (const [kind, style] of Object.entries(EDGE_STYLES)) {
    assert.match(style, /labelBackgroundColor=/, kind);
  }
});

test('width estimates grow with CJK text and fitBox respects the minimum', () => {
  assert.ok(estimateTextWidth('中文标签') > estimateTextWidth('ab'));
  assert.ok(fitBox('短').width >= 120);
  assert.ok(fitBox('一个相当长的中文标签用于测试换行').width > 120);
});

test('fitLabel wraps text and keeps its value inside the requested width', () => {
  const box = fitLabel('这是一个需要换行的长标签，包含中文与 Latin words', { maxWidth: 160, fontSize: 12 });
  assert.ok(box.lines.length > 1);
  assert.match(box.value, /<br>/);
  assert.ok(box.width <= 160);
  for (const line of box.lines) assert.ok(estimateTextWidth(line, 12) <= 160 - 32 + 1);
  assert.deepEqual(wrapText('a b', 100, 12), ['a b']);
});

test('page names drop slashes, which draw.io normalises', () => {
  assert.equal(safeName('  Flow / Main  '), 'Flow - Main');
});

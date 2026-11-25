import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities, escapeXml, parseXml } from '../shared/xml-parse.mjs';

test('decodes the entities draw.io writes in labels', () => {
  assert.equal(decodeEntities('a &lt;b&gt; &amp; &quot;c&quot; &#xa; &#65;'), 'a <b> & "c" \n A');
});

test('escaping round-trips through the parser', () => {
  const value = 'Ship & <bill> "now"';
  const { root, errors } = parseXml(`<mxCell value="${escapeXml(value)}"/>`);
  assert.deepEqual(errors, []);
  assert.equal(root.attrs.value, value);
});

test('attributes may contain > and / inside quotes', () => {
  const { root, errors } = parseXml('<mxCell value="a > b / c" style="html=1;"/>');
  assert.deepEqual(errors, []);
  assert.equal(root.attrs.value, 'a > b / c');
  assert.equal(root.attrs.style, 'html=1;');
});

test('reports mismatched and unclosed tags instead of guessing', () => {
  const mismatched = parseXml('<root><a></b></root>');
  assert.ok(mismatched.errors.some((error) => error.includes('mismatched closing tag')));

  const unclosed = parseXml('<root><a><b></b></root>');
  assert.ok(unclosed.errors.some((error) => error.includes('mismatched closing tag')));

  const truncated = parseXml('<root><a>');
  assert.ok(truncated.errors.some((error) => error.includes('unclosed element <root>')));
});

test('collects comments so the linter can reject them', () => {
  const { comments, errors } = parseXml('<root><!-- hello --><a/></root>');
  assert.deepEqual(errors, []);
  assert.deepEqual(comments, [' hello ']);
});

test('keeps child order, which is the z-order in draw.io', () => {
  const { root } = parseXml('<root><a/><b/><c/></root>');
  assert.deepEqual(root.children.map((child) => child.name), ['a', 'b', 'c']);
});

test('CDATA becomes text', () => {
  const { root } = parseXml('<mxCell><![CDATA[<b>x</b>]]></mxCell>');
  assert.equal(root.text, '<b>x</b>');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { lintFile, lintModel, parseStyle } from '../shared/drawio-lint.mjs';
import { encodeDiagramText, parseDrawioFile } from '../shared/drawio-file.mjs';

function model(body) {
  return `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${body}</root></mxGraphModel>`;
}

function lintModelXml(body) {
  const parsed = parseDrawioFile(model(body));
  return lintModel(parsed.pages[0].model, { pageName: 'test' });
}

const GOOD_VERTEX = '<mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="140" height="60" as="geometry"/></mxCell>';
const GOOD_EDGE = '<mxCell id="e1" value="Yes" style="edgeStyle=orthogonalEdgeStyle;html=1;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>';

test('style parsing keeps flags and key=value pairs', () => {
  const style = parseStyle('rounded=1;swimlane;startSize=24;html=1;');
  assert.equal(style.rounded, '1');
  assert.equal(style.swimlane, '1');
  assert.equal(style.startSize, '24');
});

test('a clean diagram produces no issues', () => {
  const issues = lintModelXml(`${GOOD_VERTEX}<mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="220" y="40" width="140" height="60" as="geometry"/></mxCell>${GOOD_EDGE}`);
  assert.deepEqual(issues, []);
});

test('html in a label without html=1 is an error, because tags render literally', () => {
  const issues = lintModelXml('<mxCell id="a" value="&lt;b&gt;Bold&lt;/b&gt;" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="140" height="60" as="geometry"/></mxCell>');
  assert.ok(issues.some((issue) => issue.code === 'STYLE001' && issue.severity === 'error'));
});

test('edges without an expanded relative geometry are rejected', () => {
  const issues = lintModelXml(`${GOOD_VERTEX}<mxCell id="b" style="rounded=1;html=1;" vertex="1" parent="1"><mxGeometry x="220" y="40" width="140" height="60" as="geometry"/></mxCell><mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;html=1;" edge="1" parent="1" source="a" target="b"/>`);
  assert.ok(issues.some((issue) => issue.code === 'EDGE001'));
});

test('dangling endpoints and duplicate ids are errors', () => {
  const issues = lintModelXml(`${GOOD_VERTEX}${GOOD_VERTEX}<mxCell id="e1" style="html=1;" edge="1" parent="1" source="a" target="ghost"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  assert.ok(issues.some((issue) => issue.code === 'CELL001'));
  assert.ok(issues.some((issue) => issue.code === 'EDGE002'));
});

test('shapes stacked on the same cell are reported', () => {
  const issues = lintModelXml(`${GOOD_VERTEX}<mxCell id="b" value="B" style="rounded=1;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="140" height="60" as="geometry"/></mxCell>`);
  assert.ok(issues.some((issue) => issue.code === 'LAYOUT001'));
});

test('children spilling out of a swimlane are reported', () => {
  const body = '<mxCell id="lane" value="Lane" style="swimlane;startSize=24;html=1;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="300" height="150" as="geometry"/></mxCell>'
    + '<mxCell id="a" value="A" style="rounded=1;html=1;" vertex="1" parent="lane"><mxGeometry x="20" y="40" width="300" height="60" as="geometry"/></mxCell>';
  const issues = lintModelXml(body);
  assert.ok(issues.some((issue) => issue.code === 'LAYOUT002'));
});

test('horizontal lanes measure the header on the left, not the top', () => {
  const lane = (childX) => '<mxCell id="lane" value="Actor" style="swimlane;horizontal=0;startSize=110;html=1;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="800" height="150" as="geometry"/></mxCell>'
    + `<mxCell id="a" value="A" style="rounded=1;html=1;" vertex="1" parent="lane"><mxGeometry x="${childX}" y="45" width="140" height="60" as="geometry"/></mxCell>`;
  assert.deepEqual(lintModelXml(lane(120)), []);
  assert.ok(lintModelXml(lane(60)).some((issue) => issue.code === 'LAYOUT003'));
});

test('an edge filed in the wrong container frame is flagged', () => {
  const body = '<mxCell id="box" value="Box" style="swimlane;startSize=24;html=1;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="600" height="300" as="geometry"/></mxCell>'
    + '<mxCell id="a" value="A" style="rounded=1;html=1;" vertex="1" parent="box"><mxGeometry x="20" y="40" width="120" height="60" as="geometry"/></mxCell>'
    + '<mxCell id="b" value="B" style="rounded=1;html=1;" vertex="1" parent="box"><mxGeometry x="200" y="40" width="120" height="60" as="geometry"/></mxCell>'
    + '<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;html=1;" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>';
  const issues = lintModelXml(body);
  assert.ok(issues.some((issue) => issue.code === 'EDGE004' && issue.message.includes('"box"')));
});

test('compressed pages are linted too, and comments are rejected at document level', () => {
  const file = `<mxfile><!-- note --><diagram id="p1" name="P">${encodeDiagramText(model(GOOD_VERTEX))}</diagram></mxfile>`;
  const result = lintFile(file);
  assert.ok(result.issues.some((issue) => issue.code === 'DOC003'));
  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].compressed, true);
  assert.equal(result.pages[0].issues.filter((issue) => issue.severity === 'error').length, 0);
});

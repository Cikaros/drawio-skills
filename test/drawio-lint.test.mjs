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

test('a label that cannot fit its shape is reported', () => {
  const body = '<mxCell id="a" value="这是一个非常长的中文标签用于测试换行" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="100" height="40" as="geometry"/></mxCell>';
  const issues = lintModelXml(body);
  assert.ok(issues.some((issue) => issue.code === 'TEXT001' && issue.cellId === 'a'));

  const clean = '<mxCell id="b" value="第一行<br>第二行" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="160" y="40" width="140" height="60" as="geometry"/></mxCell>';
  assert.equal(lintModelXml(clean).filter((issue) => issue.code === 'TEXT001').length, 0);
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

const box = (id, x, y, w = 140, h = 60) => `<mxCell id="${id}" value="${id}" style="rounded=1;html=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
const edge = (id, source, target, style = '', points = []) => {
  const array = points.length
    ? `<Array as="points">${points.map((point) => `<mxPoint x="${point[0]}" y="${point[1]}"/>`).join('')}</Array>`
    : '';
  return `<mxCell id="${id}" style="edgeStyle=orthogonalEdgeStyle;html=1;${style}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry">${array}</mxGeometry></mxCell>`;
};

test('edges sharing a corridor are reported with their direction', () => {
  const body = box('a', 40, 40) + box('b', 300, 40) + box('c', 40, 200)
    + edge('e1', 'a', 'b', 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;')
    + edge('e2', 'b', 'c', 'exitX=0;exitY=0.5;entryX=0;entryY=0.5;', [[260, 70], [260, 230]]);
  const issues = lintModelXml(body);
  const hit = issues.find((issue) => issue.code === 'EDGE005');
  assert.ok(hit);
  assert.match(hit.message, /opposite directions/);
  assert.match(hit.message, /40px/);
});

test('an edge that doubles back on itself is reported', () => {
  const body = box('a', 40, 40) + box('b', 300, 40)
    + edge('e1', 'a', 'b', 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;', [[300, 70], [200, 70], [200, 150], [300, 150]]);
  const issues = lintModelXml(body);
  assert.ok(issues.some((issue) => issue.code === 'EDGE005' && /doubles back/.test(issue.message)));
});

test('an edge routed through an unrelated box is reported', () => {
  const body = box('a', 40, 40) + box('b', 40, 300) + box('blocker', 200, 120)
    + edge('e1', 'a', 'b', 'exitX=1;exitY=0.5;entryX=0.5;entryY=0;', [[270, 70], [270, 300]]);
  const issues = lintModelXml(body);
  assert.ok(issues.some((issue) => issue.code === 'EDGE006' && issue.message.includes('blocker')));
});

test('a line along a shape border is not treated as crossing it', () => {
  const body = box('a', 40, 40) + box('b', 300, 40) + box('border', 200, 70, 60, 60)
    + edge('e1', 'a', 'b', 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;');
  assert.equal(lintModelXml(body).filter((issue) => issue.code === 'EDGE006').length, 0);
});

test('sequence messages may cross lifelines and section text', () => {
  const lifeline = (id, x) => `<mxCell id="${id}" value="${id}" style="shape=umlLifeline;perimeter=lifelinePerimeter;html=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="40" width="160" height="400" as="geometry"/></mxCell>`;
  const body = lifeline('l1', 60) + lifeline('l3', 240) + lifeline('l2', 420)
    + '<mxCell id="s" value="Section" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="180" y="110" width="240" height="22" as="geometry"/></mxCell>'
    + edge('m1', 'l1', 'l2', 'exitY=0.3;entryY=0.3;', [[300, 160], [300, 160]]);
  const issues = lintModelXml(body);
  assert.equal(issues.filter((issue) => issue.code === 'EDGE006').length, 0);
});

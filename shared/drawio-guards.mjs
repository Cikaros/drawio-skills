// Authoring helpers shared by the skill examples and the test suite.
// Pure functions only: no I/O, no network, so they are cheap to test and safe
// to copy into an agent's scratch script.

import { escapeXml } from './xml-parse.mjs';
import { estimateTextWidth, fitLabel, wrapText } from '../skills/drawio-mcp/scripts/lib/text-metrics.mjs';

export { estimateTextWidth, fitLabel, wrapText };

export const GRID = Object.freeze({
  col: (index) => index * 180 + 40,
  row: (index) => index * 120 + 40,
  box: Object.freeze({ width: 140, height: 60 }),
  diamond: Object.freeze({ width: 160, height: 90 })
});

export const ROLE_COLORS = Object.freeze({
  step: { fill: '#EEF4FF', stroke: '#9DB8F2' },
  decision: { fill: '#FFF6E0', stroke: '#E8C36A' },
  startEnd: { fill: '#E7F6EC', stroke: '#8BCB9F' },
  warning: { fill: '#FFF0E5', stroke: '#F0B48A' },
  error: { fill: '#FDECEC', stroke: '#EBA3A3' },
  data: { fill: '#F3EEFF', stroke: '#B9A6F0' },
  external: { fill: '#F2F4F7', stroke: '#B8C0CC' },
  container: { fill: '#F7F8FA', stroke: '#D5DAE1' },
  note: { fill: '#FFF9DB', stroke: '#E9D58A' }
});

export const TEXT_COLOR = '#1B1F24';

/** Role-based shape style; keep one role per node kind across a diagram. */
export function roleStyle(role, extra = '') {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.step;
  const base = `fillColor=${colors.fill};strokeColor=${colors.stroke};fontColor=${TEXT_COLOR};`;
  const suffix = extra ? `${extra.replace(/;?$/, ';')}` : '';
  return `rounded=1;whiteSpace=wrap;html=1;${base}${suffix}`;
}

export function diamondStyle(role = 'decision') {
  return roleStyle(role, 'rhombus;').replace('rounded=1;', '');
}

export function terminalStyle(role = 'startEnd') {
  return `ellipse;whiteSpace=wrap;html=1;fillColor=${ROLE_COLORS[role].fill};strokeColor=${ROLE_COLORS[role].stroke};fontColor=${TEXT_COLOR};`;
}

export function containerStyle(labelBold = true) {
  return `swimlane;startSize=24;html=1;verticalAlign=top;fillColor=${ROLE_COLORS.container.fill};strokeColor=${ROLE_COLORS.container.stroke};${labelBold ? 'fontStyle=1;' : ''}`;
}

export const EDGE_STYLES = Object.freeze({
  flow: 'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;fontColor=#5A626E;labelBackgroundColor=#FFFFFF;',
  plain: 'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#8A94A6;labelBackgroundColor=#FFFFFF;',
  org: 'edgeStyle=orthogonalEdgeStyle;endArrow=none;html=1;strokeColor=#8A94A6;labelBackgroundColor=#FFFFFF;',
  er: 'edgeStyle=entityRelationEdgeStyle;html=1;strokeColor=#8A94A6;fontColor=#5A626E;labelBackgroundColor=#FFFFFF;',
  state: 'html=1;endArrow=open;endSize=10;strokeColor=#8A94A6;fontColor=#5A626E;labelBackgroundColor=#FFFFFF;',
  dependency: 'edgeStyle=orthogonalEdgeStyle;html=1;dashed=1;endArrow=open;strokeColor=#8A94A6;labelBackgroundColor=#FFFFFF;'
});

/** Label text for draw.io: escape markup, turn newlines into <br>. */
export function label(lines) {
  const list = Array.isArray(lines) ? lines : [lines];
  return list.map((line) => escapeXml(String(line)).replace(/\r?\n/g, '<br>')).join('<br>');
}

/** Deterministic, readable ids: "n1", "d2", "e3" — never random. */
export function makeId(prefix, index) {
  return `${prefix}${index}`;
}

export function collapseWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/** Fit a box around a label: 24px padding, minimum sizes from the grid. */
export function fitBox(text, { fontSize = 12, minWidth = 120, height = 60, padding = 32 } = {}) {
  return {
    width: Math.max(minWidth, estimateTextWidth(text, fontSize) + padding),
    height
  };
}

/** Edge cell XML with the geometry that draw.io actually needs. */
export function edgeXml({ id, source, target, label: edgeLabel = '', style = EDGE_STYLES.flow, parent = '1' }) {
  const value = edgeLabel ? ` value="${escapeXml(edgeLabel)}"` : '';
  return `<mxCell id="${id}"${value} style="${style}" edge="1" parent="${parent}" source="${source}" target="${target}">\n  <mxGeometry relative="1" as="geometry"/>\n</mxCell>`;
}

export function vertexXml({ id, value = '', style, x, y, width, height, parent = '1' }) {
  return `<mxCell id="${id}" value="${escapeXml(value)}" style="${style}" vertex="1" parent="${parent}">\n  <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>\n</mxCell>`;
}

/** Convert a title into a stable page/layer name (no slashes: draw.io normalises them). */
export function safeName(title) {
  return collapseWhitespace(title).replace(/[/\\]/g, '-');
}

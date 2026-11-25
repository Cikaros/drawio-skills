// Static checks for draw.io documents. Everything here is pure: give it XML
// text (or a parsed tree) and it returns issues. No network, no browser.
// The rules encode what actually breaks a diagram in draw.io:
//   - markup that the editor refuses to load
//   - cells that exist but never render
//   - labels that render as literal <b> tags
//   - edges that are not attached, or filed in the wrong frame
//   - shapes stacked on the same cell, or spilling out of their container

import { parseDrawioFile } from './drawio-file.mjs';
import { estimateTextWidth, htmlToText, wrapText } from './text-metrics.mjs';

const SWIMLANE = 'swimlane';
const CONTAINER = 'container';
const TABLE = 'shape=table';

export function parseStyle(style) {
  const out = {};
  for (const part of String(style ?? '').split(';')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const eq = chunk.indexOf('=');
    if (eq === -1) out[chunk] = '1';
    else out[chunk.slice(0, eq).trim()] = chunk.slice(eq + 1).trim();
  }
  return out;
}

function num(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cellFromNode(node) {
  const isWrapper = node.name === 'object' || node.name === 'UserObject';
  const inner = isWrapper ? node.children.find((child) => child.name === 'mxCell') : node;
  if (!inner) return null;
  const geometry = inner.children?.find((child) => child.name === 'mxGeometry') ?? null;
  const points = [];
  const pointArray = geometry?.children?.find((child) => child.name === 'Array' && child.attrs.as === 'points');
  for (const point of pointArray?.children ?? []) {
    if (point.name === 'mxPoint') points.push({ x: num(point.attrs.x), y: num(point.attrs.y) });
  }
  const style = inner.attrs.style ?? node.attrs.style ?? '';
  return {
    id: isWrapper ? node.attrs.id : inner.attrs.id,
    value: isWrapper ? (node.attrs.label ?? node.attrs.value ?? '') : (inner.attrs.value ?? ''),
    style,
    styleMap: parseStyle(style),
    vertex: inner.attrs.vertex === '1',
    edge: inner.attrs.edge === '1',
    parent: inner.attrs.parent ?? null,
    source: inner.attrs.source ?? null,
    target: inner.attrs.target ?? null,
    tags: node.attrs.tags ?? '',
    metadata: isWrapper ? { ...node.attrs } : null,
    wrapper: isWrapper,
    geometryNode: geometry,
    relative: geometry ? geometry.attrs.relative === '1' : false,
    points,
    x: geometry ? num(geometry.attrs.x) : 0,
    y: geometry ? num(geometry.attrs.y) : 0,
    width: geometry ? num(geometry.attrs.width) : 0,
    height: geometry ? num(geometry.attrs.height) : 0
  };
}

export function collectCells(model) {
  const root = model?.children?.find((child) => child.name === 'root') ?? null;
  if (!root) return { root: null, cells: [] };
  const cells = [];
  for (const node of root.children) {
    if (!['mxCell', 'object', 'UserObject'].includes(node.name)) continue;
    const cell = cellFromNode(node);
    if (cell) cells.push(cell);
  }
  return { root, cells };
}

function ancestorIds(cell, index) {
  const chain = [];
  let current = cell;
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current.id);
    current = index.get(current.parent) ?? null;
  }
  return chain;
}

function deepestCommon(a, b, index) {
  const chainA = ancestorIds(a, index);
  const setA = new Set(chainA);
  for (const id of ancestorIds(b, index)) {
    if (setA.has(id)) return id;
  }
  return null;
}

function isContainer(cell) {
  if (!cell.vertex) return false;
  const style = cell.styleMap;
  return SWIMLANE in style || style[CONTAINER] === '1' || cell.style.trim() === 'group' || cell.style.includes('group;');
}

// Labels are laid out inside a shape, not in the full geometry box. These
// factors are deliberately conservative: a warning should send the author to
// check the render, not pretend to be pixel-perfect browser metrics.
function labelBox(cell) {
  const style = cell.styleMap;
  if (!cell.value || cell.width <= 0 || cell.height <= 0) return null;
  if (style.text === '1' || cell.style.trim() === 'text') return null;
  if (isContainer(cell) || style.shape === 'table') return null;
  if (style.shape === 'umlLifeline' || style.perimeter === 'lifelinePerimeter') return null;
  if (style.verticalLabelPosition === 'bottom' || style.verticalLabelPosition === 'top') return null;

  const shape = String(style.shape ?? '');
  let factor = 1;
  if (style.rhombus === '1' || shape === 'rhombus') factor = 0.62;
  else if (style.ellipse === '1' || shape === 'ellipse') factor = 0.72;
  else if (shape.includes('cylinder')) factor = 0.82;
  else if (/^(hexagon|triangle|parallelogram|trapezoid|step|process|manualInput|delay|display|loopLimit|dataStorage|internalStorage|offPageConnector|or|card|tape|note|callout|cube|cloud|document|singleArrow|doubleArrow|flexArrow|component|umlBoundary|umlControl|umlEntity)$/.test(shape)) factor = 0.8;

  const spacing = num(style.spacing, 2);
  const left = num(style.spacingLeft, spacing);
  const right = num(style.spacingRight, spacing);
  const top = num(style.spacingTop, spacing);
  const bottom = num(style.spacingBottom, spacing);
  return {
    width: cell.width * factor - left - right,
    height: cell.height * factor - top - bottom,
    fontSize: num(style.fontSize, 12),
    bold: (Number.parseInt(style.fontStyle, 10) & 1) === 1,
    wrap: style.whiteSpace === 'wrap'
  };
}

function labelOverflow(cell) {
  const box = labelBox(cell);
  if (!box || box.width <= 0 || box.height <= 0 || box.fontSize <= 0) return null;
  const text = htmlToText(cell.value);
  if (!text) return null;
  // Inline metadata is often set to 9–10px inside a 12px label. Measuring all
  // text at the base size produces false positives; use the smallest explicit
  // font size as a conservative hint for the whole label.
  const inlineSizes = [...String(cell.value).matchAll(/font-size\s*:\s*([\d.]+)px/gi)]
    .map((match) => Number.parseFloat(match[1]))
    .filter((size) => Number.isFinite(size) && size > 0);
  const fontSize = inlineSizes.length ? Math.min(box.fontSize, ...inlineSizes) : box.fontSize;
  const lines = box.wrap
    ? wrapText(text, box.width, fontSize, { bold: box.bold })
    : text.split('\n');
  const lineHeight = Math.ceil(fontSize * 1.2);
  const neededWidth = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize, { bold: box.bold })), 0);
  const neededHeight = lines.length * lineHeight;
  if (neededWidth <= box.width + 2 && neededHeight <= box.height + 2) return null;
  return {
    neededWidth,
    neededHeight,
    availableWidth: Math.round(box.width),
    availableHeight: Math.round(box.height),
    lines: lines.length
  };
}

// Edges are routed in page coordinates. Child cells and waypoints may be
// relative to a container, so resolve the absolute offset before geometry
// checks. Layers (parent="1") contribute no offset.
function absolutePosition(cell, index, seen = new Set()) {
  if (!cell) return { x: 0, y: 0 };
  if (seen.has(cell.id)) return { x: cell.x, y: cell.y };
  seen.add(cell.id);
  const parent = index.get(cell.parent);
  if (!parent || cell.parent === '0' || !parent.vertex) return { x: cell.x, y: cell.y };
  const origin = absolutePosition(parent, index, seen);
  return { x: origin.x + cell.x, y: origin.y + cell.y };
}

function absoluteBox(cell, index) {
  const position = absolutePosition(cell, index);
  return { x: position.x, y: position.y, width: cell.width, height: cell.height };
}

function isObstacle(cell) {
  if (!cell.vertex || !cell.geometryNode || isContainer(cell)) return false;
  const style = cell.styleMap;
  if (style.text === '1' || cell.style.trim() === 'text') return false;
  if (style.shape === 'umlLifeline' || style.perimeter === 'lifelinePerimeter') return false;
  return true;
}

function edgeRoute(edge, index) {
  const points = [];
  const source = index.get(edge.source);
  const target = index.get(edge.target);
  if (source) {
    const box = absoluteBox(source, index);
    points.push({
      x: box.x + box.width * num(edge.styleMap.exitX, 0.5),
      y: box.y + box.height * num(edge.styleMap.exitY, 0.5)
    });
  }
  const parent = index.get(edge.parent);
  const offset = parent && parent.vertex ? absolutePosition(parent, index) : { x: 0, y: 0 };
  points.push(...edge.points.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y })));
  if (target) {
    const box = absoluteBox(target, index);
    points.push({
      x: box.x + box.width * num(edge.styleMap.entryX, 0.5),
      y: box.y + box.height * num(edge.styleMap.entryY, 0.5)
    });
  }
  const trimmed = points.filter((point, i) => i === 0 || point.x !== points[i - 1].x || point.y !== points[i - 1].y);
  if (source && !('exitX' in edge.styleMap) && !('exitY' in edge.styleMap) && trimmed.length > 1) {
    trimmed[0] = borderPoint(trimmed[0], trimmed[1], absoluteBox(source, index));
  }
  if (target && !('entryX' in edge.styleMap) && !('entryY' in edge.styleMap) && trimmed.length > 1) {
    trimmed[trimmed.length - 1] = borderPoint(trimmed[trimmed.length - 1], trimmed[trimmed.length - 2], absoluteBox(target, index));
  }
  return trimmed.filter((point, i) => i === 0 || point.x !== trimmed[i - 1].x || point.y !== trimmed[i - 1].y);
}

function axisOf(segment) {
  if (Math.abs(segment.a.x - segment.b.x) < 0.5) return 'v';
  if (Math.abs(segment.a.y - segment.b.y) < 0.5) return 'h';
  return null;
}

function segmentOverlap(first, second) {
  const axis = axisOf(first);
  if (!axis || axis !== axisOf(second)) return 0;
  if (axis === 'h' && Math.abs(first.a.y - second.a.y) < 0.5) {
    return Math.max(0, Math.min(Math.max(first.a.x, first.b.x), Math.max(second.a.x, second.b.x))
      - Math.max(Math.min(first.a.x, first.b.x), Math.min(second.a.x, second.b.x)));
  }
  if (axis === 'v' && Math.abs(first.a.x - second.a.x) < 0.5) {
    return Math.max(0, Math.min(Math.max(first.a.y, first.b.y), Math.max(second.a.y, second.b.y))
      - Math.max(Math.min(first.a.y, first.b.y), Math.min(second.a.y, second.b.y)));
  }
  return 0;
}

// Liang-Barsky clip: true when the segment passes through the interior of the
// rectangle. A line running exactly along a border does not count.
function segmentHitsBox(segment, box, inset = 1.5) {
  const left = box.x + inset;
  const right = box.x + box.width - inset;
  const top = box.y + inset;
  const bottom = box.y + box.height - inset;
  if (right <= left || bottom <= top) return false;
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [segment.a.x - left, right - segment.a.x, segment.a.y - top, bottom - segment.a.y];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i += 1) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return false;
      continue;
    }
    const r = q[i] / p[i];
    if (p[i] < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

function borderPoint(center, toward, box) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return center;
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (box.x + box.width - center.x) / dx);
  if (dx < 0) t = Math.min(t, (box.x - center.x) / dx);
  if (dy > 0) t = Math.min(t, (box.y + box.height - center.y) / dy);
  if (dy < 0) t = Math.min(t, (box.y - center.y) / dy);
  if (!Number.isFinite(t) || t <= 0 || t > 1) return center;
  return { x: center.x + dx * t, y: center.y + dy * t };
}

function directionSign(first, second) {
  const axis = axisOf(first);
  if (!axis || axis !== axisOf(second)) return 0;
  const delta = (segment) => axis === 'h' ? segment.b.x - segment.a.x : segment.b.y - segment.a.y;
  return Math.sign(delta(first)) * Math.sign(delta(second));
}

function intersects(a, b, tolerance = 2) {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return (right - left) > tolerance && (bottom - top) > tolerance;
}

/**
 * Lint one mxGraphModel tree.
 * @param {object} model parsed <mxGraphModel> node
 * @param {{pageName?: string|null}} [options]
 * @returns {Array<{code:string,severity:'error'|'warn',message:string,cellId:string|null,page:string|null}>}
 */
export function lintModel(model, options = {}) {
  const page = options.pageName ?? null;
  const issues = [];
  const add = (code, severity, message, cellId = null) => {
    issues.push({ code, severity, message, cellId, page });
  };

  if (!model) {
    add('DOC001', 'error', 'no <mxGraphModel> found');
    return issues;
  }

  const { root, cells } = collectCells(model);
  if (!root) {
    add('DOC002', 'error', 'mxGraphModel has no <root> element');
    return issues;
  }

  const index = new Map();
  for (const cell of cells) {
    if (!cell.id) {
      add('CELL001', 'error', 'cell without an id attribute');
      continue;
    }
    if (index.has(cell.id)) add('CELL001', 'error', `duplicate cell id "${cell.id}"`, cell.id);
    else index.set(cell.id, cell);
  }

  if (!index.has('0')) add('CELL002', 'error', 'missing root cell id="0"');
  if (!index.has('1')) add('CELL002', 'error', 'missing default layer id="1"');

  const layerIds = new Set(cells.filter((cell) => cell.parent === '0' && !cell.vertex && !cell.edge).map((cell) => cell.id));

  for (const cell of cells) {
    if (!cell.id) continue;

    if (cell.parent && cell.parent !== '0' && !index.has(cell.parent)) {
      add('CELL003', 'error', `parent "${cell.parent}" does not exist`, cell.id);
    }
    if (cell.parent && cell.parent === cell.id) {
      add('CELL004', 'error', 'cell is its own parent', cell.id);
    }

    if (cell.id === '0') continue;

    if (cell.parent === '0' && !cell.vertex && !cell.edge && cell.id !== '0') {
      // layer cell: nothing else to check
      continue;
    }

    if (cell.edge) {
      if (!cell.geometryNode) {
        add('EDGE001', 'error', 'edge has no <mxGeometry> child; draw.io will not render it', cell.id);
      } else if (!cell.relative) {
        add('EDGE001', 'error', 'edge geometry must be relative="1"', cell.id);
      }
      if (cell.source && !index.has(cell.source)) {
        add('EDGE002', 'error', `edge source "${cell.source}" does not exist`, cell.id);
      }
      if (cell.target && !index.has(cell.target)) {
        add('EDGE002', 'error', `edge target "${cell.target}" does not exist`, cell.id);
      }
      if (!cell.source && !cell.target) {
        add('EDGE003', 'warn', 'edge has neither source nor target (floating connector)', cell.id);
      }
      if (cell.value && !cell.styleMap.labelBackgroundColor && !cell.styleMap.defaultLabelBackgroundColor) {
        add('STYLE010', 'warn', 'edge label without labelBackgroundColor/defaultLabelBackgroundColor; the line may cut through the text', cell.id);
      }
      if (cell.source && cell.target && cell.parent && cell.parent !== '0') {
        const source = index.get(cell.source);
        const target = index.get(cell.target);
        if (source && target) {
          const common = deepestCommon(source, target, index);
          if (common && common !== cell.parent) {
            add('EDGE004', 'warn', `edge is filed under "${cell.parent}" but the innermost common container is "${common}"`, cell.id);
          }
        }
      }
      continue;
    }

    if (!cell.vertex) {
      add('CELL005', 'warn', 'cell is neither vertex nor edge nor layer; it will not render', cell.id);
      continue;
    }

    if (cell.geometryNode) {
      if (cell.width < 0 || cell.height < 0) {
        add('GEO001', 'error', `negative size ${cell.width}×${cell.height}`, cell.id);
      } else if (cell.width === 0 || cell.height === 0) {
        add('GEO002', 'error', `zero size ${cell.width}×${cell.height}; the shape is invisible`, cell.id);
      }
      if (cell.x < 0 && cell.parent === '1') {
        add('GEO003', 'warn', `negative x=${cell.x} on the page layer`, cell.id);
      }
    } else if (cell.style !== 'group') {
      add('GEO004', 'warn', 'vertex without <mxGeometry>', cell.id);
    }

    if (/<[a-zA-Z/][^>]*>/.test(cell.value) && cell.styleMap.html !== '1') {
      add('STYLE001', 'error', 'label contains HTML but the style has no html=1; tags render literally', cell.id);
    }
    if (/\\n/.test(cell.value)) {
      add('STYLE002', 'warn', 'label contains a literal \\n; use &#xa; or <br> instead', cell.id);
    }
    const overflow = labelOverflow(cell);
    if (overflow) {
      add('TEXT001', 'warn', `label likely overflows ${cell.width}×${cell.height}: needs about ${overflow.neededWidth}×${overflow.neededHeight} in ${overflow.availableWidth}×${overflow.availableHeight} (${overflow.lines} line(s)); add <br>, widen the shape, or reduce fontSize`, cell.id);
    }
    if (cell.parent && cell.parent !== '0' && !layerIds.has(cell.parent)) {
      const parent = index.get(cell.parent);
      if (parent && parent.vertex && parent.geometryNode) {
        const horizontal = parent.styleMap.horizontal === '0';
        const startSize = num(parent.styleMap.startSize, parent.styleMap[SWIMLANE] ? 30 : 0);
        const offsetX = horizontal ? startSize : 0;
        const offsetY = horizontal ? 0 : (parent.styleMap[SWIMLANE] ? startSize : 0);
        if (cell.x + 1 < offsetX || cell.y + 1 < offsetY) {
          add('LAYOUT003', 'warn', `child starts inside the ${horizontal ? 'left' : 'top'} header of "${parent.id}" (startSize=${startSize})`, cell.id);
        }
        if (parent.width > 0 && parent.height > 0) {
          if (cell.x + cell.width > parent.width + 1 || cell.y + cell.height > parent.height + 1) {
            add('LAYOUT002', 'warn', `child exceeds the bounds of container "${parent.id}" (${parent.width}×${parent.height})`, cell.id);
          }
        }
      }
    }
  }

  const byParent = new Map();
  for (const cell of cells) {
    if (!cell.vertex || !cell.geometryNode) continue;
    if (isContainer(cell)) continue;
    const key = cell.parent ?? '(none)';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(cell);
  }
  for (const group of byParent.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i];
        const b = group[j];
        if (intersects(a, b)) {
          add('LAYOUT001', 'warn', `shapes "${a.id}" and "${b.id}" overlap in the same parent`, a.id);
        }
      }
    }
  }

  // Edge geometry checks. These catch the two failure modes that make a
  // diagram unreadable without breaking XML: several connectors sharing one
  // visual line (especially in opposite directions) and a connector routed
  // straight through an unrelated box.
  const routed = [];
  for (const cell of cells) {
    if (!cell.edge || !cell.geometryNode) continue;
    const path = edgeRoute(cell, index);
    if (path.length < 2) continue;
    const segments = path.slice(1).map((point, i) => ({ a: path[i], b: point }));
    routed.push({ cell, segments });
  }

  const overlapThreshold = 12;
  const reportedPairs = new Set();
  for (const route of routed) {
    if (route.cell.source === route.cell.target) continue;
    let doubled = false;
    for (let i = 0; i < route.segments.length && !doubled; i += 1) {
      for (let j = i + 1; j < route.segments.length; j += 1) {
        const length = segmentOverlap(route.segments[i], route.segments[j]);
        if (length > overlapThreshold) {
          add('EDGE005', 'warn', `edge "${route.cell.id}" doubles back on a ${Math.round(length)}px segment; separate the outbound and return corridors`, route.cell.id);
          doubled = true;
          break;
        }
      }
    }
  }

  for (let i = 0; i < routed.length; i += 1) {
    for (let j = i + 1; j < routed.length; j += 1) {
      const first = routed[i];
      const second = routed[j];
      const key = [first.cell.id, second.cell.id].sort().join('|');
      if (reportedPairs.has(key)) continue;
      let best = 0;
      let opposite = false;
      for (const a of first.segments) {
        for (const b of second.segments) {
          const length = segmentOverlap(a, b);
          if (length > best) {
            best = length;
            opposite = directionSign(a, b) < 0;
          }
        }
      }
      if (best > overlapThreshold) {
        reportedPairs.add(key);
        const direction = opposite ? 'in opposite directions' : 'in the same direction';
        add('EDGE005', 'warn', `edges "${first.cell.id}" and "${second.cell.id}" share a ${Math.round(best)}px segment ${direction}; give each edge its own corridor or ports`, first.cell.id);
      }
    }
  }

  const obstacles = cells.filter(isObstacle);
  for (const route of routed) {
    const crossed = new Set();
    for (const segment of route.segments) {
      for (const vertex of obstacles) {
        if (vertex.id === route.cell.source || vertex.id === route.cell.target) continue;
        if (crossed.has(vertex.id)) continue;
        if (segmentHitsBox(segment, absoluteBox(vertex, index))) {
          crossed.add(vertex.id);
          add('EDGE006', 'warn', `edge "${route.cell.id}" crosses shape "${vertex.id}"; route around it or attach to it`, route.cell.id);
        }
      }
    }
  }

  return issues;
}

/**
 * Lint a whole .drawio document (all pages).
 * @param {string} xml
 * @returns {{kind:string, pages:Array<{index:number,name:string|null,issues:Array}>, issues:Array, errors:string[]}}
 */
export function lintFile(xml) {
  const parsed = parseDrawioFile(xml);
  const docIssues = [];
  if (parsed.errors.length) {
    for (const message of parsed.errors) {
      docIssues.push({ code: 'XML001', severity: 'error', message, cellId: null, page: null });
    }
  }
  if (parsed.comments.length) {
    for (const comment of parsed.comments) {
      docIssues.push({ code: 'DOC003', severity: 'error', message: `XML comment is not allowed in draw.io output: ${comment.trim().slice(0, 60)}`, cellId: null, page: null });
    }
  }
  if (parsed.kind === 'invalid') {
    docIssues.push({ code: 'DOC004', severity: 'error', message: 'document root is neither <mxfile> nor <mxGraphModel>', cellId: null, page: null });
  }

  const pages = [];
  const seenIds = new Map();
  const seenNames = new Map();
  for (const page of parsed.pages) {
    const pageIssues = [];
    if (page.error) {
      pageIssues.push({ code: 'DOC005', severity: 'error', message: page.error, cellId: null, page: page.name });
    }
    if (page.id) {
      if (seenIds.has(page.id)) pageIssues.push({ code: 'PAGE001', severity: 'error', message: `duplicate page id "${page.id}"`, cellId: null, page: page.name });
      seenIds.set(page.id, true);
    }
    if (page.name) {
      if (seenNames.has(page.name)) pageIssues.push({ code: 'PAGE002', severity: 'warn', message: `duplicate page name "${page.name}"`, cellId: null, page: page.name });
      seenNames.set(page.name, true);
    }
    if (page.model) pageIssues.push(...lintModel(page.model, { pageName: page.name }));
    pages.push({ index: page.index, id: page.id, name: page.name, compressed: page.compressed, issues: pageIssues });
  }

  return {
    kind: parsed.kind,
    pages,
    issues: [...docIssues, ...pages.flatMap((page) => page.issues)],
    errors: parsed.errors
  };
}

export function formatIssues(result, file) {
  const lines = [];
  const errors = result.issues.filter((issue) => issue.severity === 'error').length;
  const warns = result.issues.filter((issue) => issue.severity === 'warn').length;
  lines.push(`${file}: ${errors} error(s), ${warns} warning(s)`);
  for (const page of result.pages) {
    if (!page.issues.length) continue;
    lines.push(`  page ${page.index}${page.name ? ` "${page.name}"` : ''}${page.compressed ? ' [compressed]' : ''}`);
    for (const issue of page.issues) {
      lines.push(`    ${issue.severity.padEnd(5)} ${issue.code} ${issue.message}${issue.cellId ? ` (cell ${issue.cellId})` : ''}`);
    }
  }
  return lines.join('\n');
}

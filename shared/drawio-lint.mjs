// Static checks for draw.io documents. Everything here is pure: give it XML
// text (or a parsed tree) and it returns issues. No network, no browser.
// The rules encode what actually breaks a diagram in draw.io:
//   - markup that the editor refuses to load
//   - cells that exist but never render
//   - labels that render as literal <b> tags
//   - edges that are not attached, or filed in the wrong frame
//   - shapes stacked on the same cell, or spilling out of their container

import { parseDrawioFile } from './drawio-file.mjs';

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

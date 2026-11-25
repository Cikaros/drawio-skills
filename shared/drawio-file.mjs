// Reading and writing .drawio containers (mxfile) without dependencies.
// A .drawio file is either a bare <mxGraphModel> or an <mxfile> with one or
// more <diagram> pages. draw.io may store a page either as inline XML or as a
// compressed text payload: encodeURIComponent(base64(deflateRaw(uri(xml)))).

import zlib from 'node:zlib';
import { escapeXml, parseXml, serializeXml } from './xml-parse.mjs';

export const MXFILE_VERSION = '24.7.17';

function tryInflate(buffer) {
  const attempts = [zlib.inflateRawSync, zlib.inflateSync, zlib.gunzipSync];
  for (const fn of attempts) {
    try {
      return fn(buffer).toString('utf8');
    } catch {
      // try the next container format
    }
  }
  return null;
}

function decodeUriLayers(text) {
  let out = text;
  for (let round = 0; round < 2 && /%[0-9a-fA-F]{2}/.test(out); round += 1) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Decode a compressed <diagram> payload into mxGraphModel XML.
 * @returns {{xml: string|null, error: string|null}}
 */
export function decodeDiagramText(payload) {
  const raw = String(payload ?? '').trim();
  if (!raw) return { xml: null, error: 'empty diagram payload' };
  if (raw.startsWith('<')) return { xml: raw, error: null };

  const unescaped = decodeUriLayers(raw).replace(/\s+/g, '');
  const base64 = unescaped.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  let buffer;
  try {
    buffer = Buffer.from(padded, 'base64');
  } catch (error) {
    return { xml: null, error: `base64 decode failed: ${error.message}` };
  }
  if (!buffer.length) return { xml: null, error: 'decoded payload is empty' };

  const inflated = tryInflate(buffer);
  if (inflated === null) {
    return { xml: null, error: 'payload is not deflate/gzip compressed XML' };
  }
  const xml = decodeUriLayers(inflated);
  return { xml, error: null };
}

/** Compress mxGraphModel XML the way draw.io stores it in a .drawio file.
 *  File payloads are plain base64; URI encoding is only used when embedding the
 *  same blob into an editor URL. draw.io's own reader rejects a URI-encoded
 *  payload with "invalid bit length repeat". */
export function encodeDiagramText(xml) {
  const preEncoded = encodeURIComponent(xml);
  const deflated = zlib.deflateRawSync(Buffer.from(preEncoded, 'utf8'));
  return deflated.toString('base64');
}

/** Serialize a model tree back to XML. */
export function modelToXml(model) {
  return serializeXml(model);
}

/**
 * Parse a .drawio document into pages.
 * @returns {{
 *   kind: 'mxfile'|'model'|'invalid',
 *   pages: Array<{index:number,id:string|null,name:string|null,model:object|null,compressed:boolean,error:string|null}>,
 *   errors: string[],
 *   comments: string[]
 * }}
 */
export function parseDrawioFile(xml) {
  const parsed = parseXml(xml);
  const base = { pages: [], errors: [...parsed.errors], comments: parsed.comments };
  if (!parsed.root) return { ...base, kind: 'invalid' };

  if (parsed.root.name === 'mxGraphModel') {
    return {
      ...base,
      kind: 'model',
      pages: [{ index: 0, id: null, name: null, model: parsed.root, compressed: false, error: null }]
    };
  }
  if (parsed.root.name !== 'mxfile') {
    return { ...base, kind: 'invalid', errors: [...base.errors, `unexpected root element <${parsed.root.name}>`] };
  }

  const diagrams = parsed.root.children.filter((child) => child.name === 'diagram');
  const pages = diagrams.map((diagram, index) => {
    const inline = diagram.children.find((child) => child.name === 'mxGraphModel') ?? null;
    if (inline) {
      return { index, id: diagram.attrs.id ?? null, name: diagram.attrs.name ?? null, model: inline, compressed: false, error: null };
    }
    const payload = (diagram.text ?? '').trim();
    if (!payload) {
      return { index, id: diagram.attrs.id ?? null, name: diagram.attrs.name ?? null, model: null, compressed: false, error: 'diagram has neither inline XML nor text payload' };
    }
    const decoded = decodeDiagramText(payload);
    if (!decoded.xml) {
      return { index, id: diagram.attrs.id ?? null, name: diagram.attrs.name ?? null, model: null, compressed: true, error: decoded.error };
    }
    const inner = parseXml(decoded.xml);
    return {
      index,
      id: diagram.attrs.id ?? null,
      name: diagram.attrs.name ?? null,
      model: inner.root?.name === 'mxGraphModel' ? inner.root : null,
      compressed: true,
      error: inner.root?.name === 'mxGraphModel' ? null : 'decoded payload is not an mxGraphModel'
    };
  });

  return { ...base, kind: 'mxfile', pages };
}

export function listPages(xml) {
  const parsed = parseDrawioFile(xml);
  return {
    kind: parsed.kind,
    errors: parsed.errors,
    pages: parsed.pages.map((page) => {
      const root = page.model?.children?.find((child) => child.name === 'root') ?? null;
      const cells = root?.children ?? [];
      return {
        index: page.index,
        id: page.id,
        name: page.name,
        compressed: page.compressed,
        error: page.error,
        vertices: cells.filter((cell) => cell.attrs.vertex === '1').length,
        edges: cells.filter((cell) => cell.attrs.edge === '1').length
      };
    })
  };
}

function defaultModelAttrs() {
  return {
    dx: '800', dy: '600', grid: '1', gridSize: '10', guides: '1', tooltips: '1',
    connect: '1', arrows: '1', fold: '1', page: '1', pageScale: '1',
    pageWidth: '827', pageHeight: '1169', math: '0', shadow: '0'
  };
}

/**
 * Wrap one or more models into a valid mxfile document.
 * @param {Array<{name?:string,id?:string,modelXml:string}>} pages
 */
export function buildMxfile(pages) {
  const stamp = new Date().toISOString();
  const body = pages.map((page, index) => {
    const id = page.id ?? `page-${index + 1}`;
    const name = page.name ?? `Page-${index + 1}`;
    const model = page.modelXml.trim();
    if (model.startsWith('<mxGraphModel')) {
      return `  <diagram id="${escapeXml(id)}" name="${escapeXml(name)}">\n    ${model}\n  </diagram>`;
    }
    return `  <diagram id="${escapeXml(id)}" name="${escapeXml(name)}">\n${model}\n  </diagram>`;
  }).join('\n');
  return `<mxfile host="app.diagrams.net" modified="${stamp}" agent="drawio-skills" version="${MXFILE_VERSION}">\n${body}\n</mxfile>\n`;
}

export function buildModel({ cells, attrs = {} }) {
  const merged = { ...defaultModelAttrs(), ...attrs };
  const attrText = Object.entries(merged).map(([key, value]) => ` ${key}="${escapeXml(value)}"`).join('');
  return `<mxGraphModel${attrText}>\n  <root>\n${cells.join('\n')}\n  </root>\n</mxGraphModel>`;
}

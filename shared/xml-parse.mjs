// Dependency-free, tolerant XML reader for draw.io files.
// It is intentionally small: draw.io only needs elements, attributes, text and
// comments. It is NOT a general purpose XML implementation (no namespaces
// resolution, no DTD, no entity declaration) — but it never silently accepts
// unbalanced markup, which is what the validator is for.

const NAME_START = /[A-Za-z_:]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-]/;

export function decodeEntities(input) {
  return String(input).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code)) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    switch (body) {
      case 'amp': return '&';
      case 'lt': return '<';
      case 'gt': return '>';
      case 'quot': return '"';
      case 'apos': return "'";
      case 'nbsp': return '\u00a0';
      default: return whole;
    }
  });
}

export function escapeXml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createNode(name, attrs = {}) {
  return { name, attrs: { ...attrs }, children: [], text: '' };
}

/**
 * Parse an XML document.
 * @returns {{root: object|null, errors: string[], comments: string[]}}
 */
export function parseXml(input) {
  const text = String(input ?? '').replace(/^\uFEFF/, '');
  const errors = [];
  const comments = [];
  const stack = [];
  let root = null;
  let i = 0;

  const appendText = (chunk) => {
    if (!chunk) return;
    if (stack.length === 0) {
      if (chunk.trim()) errors.push(`text outside the root element: ${JSON.stringify(chunk.trim().slice(0, 40))}`);
      return;
    }
    stack[stack.length - 1].text += chunk;
  };

  const readName = () => {
    if (!NAME_START.test(text[i] ?? '')) return '';
    const start = i;
    i += 1;
    while (i < text.length && NAME_CHAR.test(text[i])) i += 1;
    return text.slice(start, i);
  };

  const skipSpace = () => {
    while (i < text.length && /\s/.test(text[i])) i += 1;
  };

  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt === -1) {
      appendText(text.slice(i));
      break;
    }
    if (lt > i) appendText(text.slice(i, lt));
    i = lt;

    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      comments.push(text.slice(i + 4, end === -1 ? text.length : end));
      i = end === -1 ? text.length : end + 3;
      if (end === -1) errors.push('unterminated XML comment');
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      const end = text.indexOf(']]>', i + 9);
      appendText(text.slice(i + 9, end === -1 ? text.length : end));
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (text.startsWith('<!', i)) {
      // DOCTYPE and friends: skip to the closing '>'.
      const end = text.indexOf('>', i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    if (text[i + 1] === '/') {
      i += 2;
      const name = readName();
      skipSpace();
      if (text[i] !== '>') {
        errors.push(`malformed closing tag </${name || '?'}>`);
        const end = text.indexOf('>', i);
        i = end === -1 ? text.length : end + 1;
        continue;
      }
      i += 1;
      const open = stack.pop();
      if (!open) {
        errors.push(`closing tag </${name}> without an open element`);
      } else if (open.name !== name) {
        errors.push(`mismatched closing tag: <${open.name}> closed by </${name}>`);
      }
      continue;
    }

    // Opening tag.
    i += 1;
    const name = readName();
    if (!name) {
      errors.push(`malformed tag at offset ${i - 1}`);
      const end = text.indexOf('>', i);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    const node = createNode(name);
    let selfClosing = false;
    let closed = false;
    while (i < text.length) {
      skipSpace();
      if (text.startsWith('/>', i)) {
        selfClosing = true;
        i += 2;
        closed = true;
        break;
      }
      if (text[i] === '>') {
        i += 1;
        closed = true;
        break;
      }
      const attrName = readName();
      if (!attrName) {
        errors.push(`malformed attribute in <${name}>: ${JSON.stringify(text.slice(i, i + 20))}`);
        const end = text.indexOf('>', i);
        i = end === -1 ? text.length : end + 1;
        closed = true;
        break;
      }
      skipSpace();
      if (text[i] !== '=') {
        node.attrs[attrName] = '';
        continue;
      }
      i += 1;
      skipSpace();
      const quote = text[i];
      if (quote !== '"' && quote !== "'") {
        const start = i;
        while (i < text.length && !/[\s/>]/.test(text[i])) i += 1;
        node.attrs[attrName] = decodeEntities(text.slice(start, i));
        continue;
      }
      const end = text.indexOf(quote, i + 1);
      if (end === -1) {
        errors.push(`unterminated attribute value for ${attrName} in <${name}>`);
        node.attrs[attrName] = decodeEntities(text.slice(i + 1));
        i = text.length;
        closed = true;
        break;
      }
      node.attrs[attrName] = decodeEntities(text.slice(i + 1, end));
      i = end + 1;
    }
    if (!closed) errors.push(`unterminated opening tag <${name}>`);

    if (!root) root = node;
    else if (stack.length) stack[stack.length - 1].children.push(node);
    else errors.push(`second root element <${name}>`);

    if (!selfClosing) stack.push(node);
  }

  for (const open of stack) errors.push(`unclosed element <${open.name}>`);

  return { root, errors, comments };
}

export function serializeXml(node) {
  const attrs = Object.entries(node.attrs ?? {})
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join('');
  if (!node.children.length && !node.text) return `<${node.name}${attrs}/>`;
  const inner = (node.text ?? '') + node.children.map(serializeXml).join('');
  return `<${node.name}${attrs}>${inner}</${node.name}>`;
}

export function findChild(node, name) {
  return node?.children?.find((child) => child.name === name) ?? null;
}

export function findChildren(node, name) {
  return node?.children?.filter((child) => child.name === name) ?? [];
}

// Deterministic text measurement for draw.io labels. Agent-side layout often
// fails because boxes are sized first and labels are never wrapped; these
// helpers let callers wrap and size a label before writing XML.

import { escapeXml } from './xml-parse.mjs';

const CJK = /[\u2e80-\u9fff\u3040-\u30ff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/u;
const BREAKABLE_PUNCT = /[，。！？；：、（）【】《》“”‘’…—]/u;
const SPACE = /\s/;

/** Approximate rendered width in pixels: CJK = 1em, Latin = ~0.55em. */
export function estimateTextWidth(text, fontSize = 12, { bold = false } = {}) {
  const size = Number(fontSize) > 0 ? Number(fontSize) : 12;
  let units = 0;
  for (const char of String(text ?? '')) {
    if (SPACE.test(char)) units += 0.35;
    else if (CJK.test(char)) units += 1;
    else if (/[A-Z0-9]/.test(char)) units += 0.62;
    else if (/[a-z]/.test(char)) units += 0.54;
    else units += 0.45;
  }
  return Math.ceil(units * size * (bold ? 1.06 : 1));
}

function tokenize(line) {
  const tokens = [];
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (SPACE.test(char)) {
      let end = index + 1;
      while (end < line.length && SPACE.test(line[end])) end += 1;
      tokens.push({ space: true });
      index = end;
    } else if (CJK.test(char) || BREAKABLE_PUNCT.test(char)) {
      tokens.push({ text: char });
      index += 1;
    } else {
      let end = index + 1;
      while (end < line.length && !SPACE.test(line[end]) && !CJK.test(line[end]) && !BREAKABLE_PUNCT.test(line[end])) end += 1;
      tokens.push({ text: line.slice(index, end) });
      index = end;
    }
  }
  return tokens;
}

/**
 * Wrap a plain-text label to a pixel width. CJK characters can break between
 * characters; Latin words are kept together (an over-wide word is returned as
 * one line so the caller can detect the overflow).
 */
export function wrapText(text, maxWidth, fontSize = 12, { bold = false } = {}) {
  const width = Math.max(1, Number(maxWidth) || 1);
  const lines = [];
  for (const paragraph of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const token of tokenize(paragraph)) {
      if (token.space) {
        if (current && !current.endsWith(' ')) current += ' ';
        continue;
      }
      const candidate = current ? current + token.text : token.text;
      if (current && estimateTextWidth(candidate, fontSize, { bold }) > width) {
        lines.push(current.trimEnd());
        current = token.text;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current.trimEnd());
  }
  return lines.length ? lines : [''];
}

/** Strip the HTML that can appear in a draw.io label, preserving line breaks. */
export function htmlToText(value) {
  return String(value ?? '')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<hr\b[^>]*>/gi, '\n')
    .replace(/<\/(?:div|p|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * Size a box around wrapped text and return the exact `value` to write.
 * `value` already contains escaped text and `<br>` line breaks.
 */
export function fitLabel(text, {
  fontSize = 12,
  maxWidth = 240,
  minWidth = 120,
  minHeight = 60,
  padding = 32,
  bold = false,
  lineHeight = 1.2
} = {}) {
  const innerWidth = Math.max(20, maxWidth - padding);
  const lines = wrapText(htmlToText(text), innerWidth, fontSize, { bold });
  const contentWidth = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize, { bold })), 0);
  const contentHeight = lines.length * Math.ceil(fontSize * lineHeight);
  return {
    width: Math.min(maxWidth, Math.max(minWidth, contentWidth + padding)),
    height: Math.max(minHeight, contentHeight + padding),
    lines,
    value: lines.map((line) => escapeXml(line)).join('<br>')
  };
}

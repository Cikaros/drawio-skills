#!/usr/bin/env node
// Probe: the compressed-page format must stay byte-compatible with draw.io.
// 1. encode -> plain base64 only (no URI escapes)
// 2. decode -> exact XML
// 3. a file written by us parses as one compressed page
// 4. URI-encoded payloads still decode locally (URL flavour), even though the
//    MCP server rejects them in files.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildMxfile, decodeDiagramText, encodeDiagramText, parseDrawioFile } from '../../shared/drawio-file.mjs';

const model = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
const failures = [];

const payload = encodeDiagramText(model);
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) failures.push('payload is not plain base64');
if (payload.includes('%')) failures.push('payload contains URI escapes');

const decoded = decodeDiagramText(payload);
if (decoded.xml !== model) failures.push('round-trip mismatch');

const uriEncoded = encodeURIComponent(payload);
if (decodeDiagramText(uriEncoded).xml !== model) failures.push('URI-encoded payload should decode locally (tolerant reader)');

const file = buildMxfile([{ name: 'Packed', modelXml: model }]);
const parsed = parseDrawioFile(file);
if (parsed.pages.length !== 1 || parsed.pages[0].compressed) failures.push('buildMxfile should inline the model');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drawio-probe-'));
const compressedFile = `<mxfile><diagram id="p1" name="Packed">${payload}</diagram></mxfile>`;
const target = path.join(tmp, 'compressed.drawio');
fs.writeFileSync(target, compressedFile);
const reread = parseDrawioFile(fs.readFileSync(target, 'utf8'));
if (!reread.pages[0].compressed) failures.push('compressed page not detected');
if (reread.pages[0].model?.name !== 'mxGraphModel') failures.push('compressed page did not decode to a model');
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`payload length: ${payload.length}`);
console.log(`plain base64: ${/^[A-Za-z0-9+/]+={0,2}$/.test(payload)}`);
console.log(`uri-encoded accepted locally: ${decodeDiagramText(uriEncoded).xml === model}`);
console.log(failures.length ? `FAIL\n- ${failures.join('\n- ')}` : 'PASS');
process.exit(failures.length ? 1 : 0);

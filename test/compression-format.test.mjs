import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeDiagramText } from '../shared/drawio-file.mjs';

test('a stored payload is plain base64, never URI-encoded', () => {
  const payload = encodeDiagramText('<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>');
  assert.match(payload, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.ok(!payload.includes('%'));
});

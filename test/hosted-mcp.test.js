// The hosted MCP endpoint (api/mcp.js) serves invented sample data over JSON-RPC.
// Called directly with minimal request and response stand-ins, as Vercel would.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/mcp.js';

function call(method, body) {
  return new Promise((resolve) => {
    const res = { headers: {}, statusCode: 200, payload: undefined };
    res.setHeader = (key, value) => { res.headers[key.toLowerCase()] = value; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (value) => { res.payload = value; resolve(res); return res; };
    res.end = () => { resolve(res); return res; };
    handler({ method, body }, res);
  });
}
const rpc = (id, name, params) => call('POST', { jsonrpc: '2.0', id, method: name, params });
const text = (res) => JSON.parse(res.payload.result.content[0].text);

test('hosted copy of the decision engine is byte-identical to the app copy', () => {
  const app = readFileSync(new URL('../src/public/assistant-core.js', import.meta.url), 'utf8');
  const hosted = readFileSync(new URL('../docs/assistant-core.js', import.meta.url), 'utf8');
  assert.equal(hosted, app);
});

test('initialize negotiates a supported version and declares tools only', async () => {
  const res = await rpc(1, 'initialize', { protocolVersion: '2025-03-26' });
  assert.equal(res.payload.result.protocolVersion, '2025-03-26');
  assert.deepEqual(Object.keys(res.payload.result.capabilities), ['tools']);
  const unknown = await rpc(2, 'initialize', { protocolVersion: '1999-01-01' });
  assert.equal(unknown.payload.result.protocolVersion, '2025-06-18');
});

test('lists three read-only tools and nothing that can send', async () => {
  const { tools } = (await rpc(1, 'tools/list')).payload.result;
  assert.deepEqual(tools.map((t) => t.name), ['todays_plan', 'client_promises', 'draft_for']);
  assert.ok(tools.every((t) => t.annotations.readOnlyHint && !t.annotations.destructiveHint));
});

test('sample plan opens on the broken promise, and says nothing was sent', async () => {
  const body = text(await rpc(1, 'tools/call', { name: 'todays_plan', arguments: {} }));
  assert.match(body.provenance, /Invented sample invoices/);
  assert.match(body.provenance, /Nothing was sent/);
  assert.equal(body.data[0].verdict, 'follow_up_broken_promise');
  assert.equal(body.data[0].payer, 'Marcus Osei');
  const promises = text(await rpc(2, 'tools/call', { name: 'client_promises', arguments: {} }));
  assert.deepEqual(promises.data.map((p) => p.payer), ['Marcus Osei', 'Priya Nair']);
  const draft = text(await rpc(3, 'tools/call', { name: 'draft_for', arguments: { query: 'Marcus' } }));
  assert.match(draft.data.wording, /You mentioned payment for invoice F-1038/);
});

test('rejects unknown tools, extra arguments, missing query and bad JSON-RPC', async () => {
  assert.equal((await rpc(1, 'tools/call', { name: 'approve_reminder', arguments: {} })).payload.error.code, -32602);
  assert.equal((await rpc(2, 'tools/call', { name: 'todays_plan', arguments: { query: 'x' } })).payload.error.code, -32602);
  assert.equal((await rpc(3, 'tools/call', { name: 'draft_for', arguments: {} })).payload.error.code, -32602);
  assert.equal((await rpc(4, 'tools/call', { name: 'draft_for', arguments: { query: 'x'.repeat(201) } })).payload.error.code, -32602);
  assert.equal((await rpc(5, 'no/such/method')).payload.error.code, -32601);
  assert.equal((await call('POST', { id: 6, method: 'ping' })).payload.error.code, -32600);
});

test('only POST is accepted, notifications get no body, batches are bounded', async () => {
  const get = await call('GET');
  assert.equal(get.statusCode, 405);
  assert.equal(get.headers.allow, 'POST, OPTIONS');
  const note = await call('POST', { jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(note.statusCode, 202);
  const batch = await call('POST', [{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
  assert.equal(batch.payload.length, 2);
  const tooMany = await call('POST', Array.from({ length: 21 }, (_, i) => ({ jsonrpc: '2.0', id: i, method: 'ping' })));
  assert.equal(tooMany.statusCode, 400);
});

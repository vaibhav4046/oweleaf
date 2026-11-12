// Real tests for the MCP client (against an injected fetch, no network) and
// the tool registry (direct + mcp-prefixed tools).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { McpHttpClient } from '../src/mcp.js';
import { ToolRegistry, buildRegistry } from '../src/tools.js';
import { MockPayPalClient } from '../src/mock-paypal.js';

function fakeMcpFetch(handlers) {
  return async (url, opts) => {
    const req = JSON.parse(opts.body);
    const result = handlers[req.method] ? await handlers[req.method](req.params) : null;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'sess-1' },
      text: async () => JSON.stringify({ jsonrpc: '2.0', id: req.id, result }),
    };
  };
}

test('MCP HTTP client: initialize -> tools/list -> tools/call round trip', async () => {
  const seen = [];
  const client = new McpHttpClient({
    url: 'https://mcp.example.test/',
    fetchImpl: fakeMcpFetch({
      initialize: (p) => { seen.push(['initialize', p.clientInfo.name]); return { protocolVersion: '2025-03-26', serverInfo: { name: 'paypal' } }; },
      'notifications/initialized': () => { seen.push(['initialized']); return {}; },
      'tools/list': () => ({ tools: [{ name: 'list_invoices' }, { name: 'send_invoice_reminder' }] }),
      'tools/call': (p) => ({ content: [{ type: 'text', text: `called ${p.name}` }] }),
    }),
  });
  const tools = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name), ['list_invoices', 'send_invoice_reminder']);
  const r = await client.callTool('send_invoice_reminder', { invoice_id: 'X' });
  assert.equal(r.content[0].text, 'called send_invoice_reminder');
  assert.deepEqual(seen[0], ['initialize', 'farthing']);
});

test('MCP HTTP client: parses SSE-wrapped responses', async () => {
  const client = new McpHttpClient({
    url: 'https://mcp.example.test/',
    fetchImpl: async (url, opts) => {
      const req = JSON.parse(opts.body);
      return {
        ok: true, status: 200,
        headers: { get: () => null },
        text: async () => `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2025-03-26' } })}\n\n`,
      };
    },
  });
  const r = await client.initialize();
  assert.equal(r.protocolVersion, '2025-03-26');
});

test('MCP HTTP client: JSON-RPC error surfaces as McpError', async () => {
  const client = new McpHttpClient({
    url: 'https://mcp.example.test/',
    fetchImpl: async (url, opts) => {
      const req = JSON.parse(opts.body);
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'method not found' } }) };
    },
  });
  await assert.rejects(() => client.initialize(), /method not found/);
});

test('tool registry: direct PayPal tools route to the client; unknown tools rejected', async () => {
  const paypal = new MockPayPalClient();
  const reg = buildRegistry({ paypal });
  const names = reg.list().map((t) => t.name);
  assert.ok(names.includes('paypal.listInvoices') && names.includes('paypal.remind') && !names.includes('mcp.call'));
  const invoices = await reg.call('paypal.listInvoices', {});
  assert.equal(invoices.length, 5);
  await assert.rejects(() => reg.call('nope.tool', {}), /unknown tool/);
});

test('tool registry with MCP: mcp tools registered and callable', async () => {
  const paypal = new MockPayPalClient();
  const fakeMcp = { listTools: async () => [{ name: 'list_invoices' }], callTool: async (n, a) => ({ ok: true, n, a }) };
  const reg = buildRegistry({ paypal, mcp: fakeMcp });
  const names = reg.list().map((t) => t.name);
  assert.ok(names.includes('mcp.listTools') && names.includes('mcp.call'));
  const r = await reg.call('mcp.call', { name: 'list_invoices', arguments: {} });
  assert.equal(r.n, 'list_invoices');
});

// The assistant and the MCP tools share one decision engine. These tests pin its
// verdicts, its refusal to act, and the stdio MCP server end to end in fixture mode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { todaysPlan, clientPromises, draftFor, answer, findRow } from '../src/public/assistant-core.js';

const iso = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const invoice = (id, number, payerName, amount, daysOverdue, chaseable = true, status = 'SENT') =>
  ({ id, number, payerName, payerEmail: `${payerName.split(' ')[0].toLowerCase()}@x.example`, amount, currency: 'GBP', daysOverdue, chaseable, status });
const rows = [
  { invoice: invoice('1', 'F-1042', 'Amelia Bryant', '450.00', 3), hold: null },
  { invoice: invoice('2', 'F-1038', 'Marcus Osei', '1280.00', 12), hold: { reason: 'finance will pay this week', until: iso(-4), passed: true, daysPast: 4 } },
  { invoice: invoice('3', 'F-1029', 'Priya Nair', '320.00', 27), hold: { reason: 'payment run', until: iso(3), passed: false, daysPast: 0 } },
  { invoice: invoice('4', 'F-1045', 'Amelia Bryant', '600.00', 0, false, 'PAID'), hold: null },
  { invoice: invoice('5', 'F-1046', 'Tom Herrera', '890.00', 0, false, 'SENT'), hold: null },
];
const proposals = [
  { invoiceId: '2', status: 'pending', subject: 'Following up: invoice F-1038', note: 'Hi Marcus, you mentioned payment by 8 November.' },
  { invoiceId: '1', status: 'pending', subject: 'Friendly nudge', note: 'Hi Amelia' },
];

test('plan puts the broken promise first and says why each invoice is left alone', () => {
  const plan = todaysPlan(rows, proposals);
  assert.deepEqual(plan.slice(0, 3).map((p) => p.verdict), ['follow_up_broken_promise', 'review_reminder', 'leave_alone']);
  assert.deepEqual(plan.slice(3).map((p) => p.verdict).sort(), ['not_due', 'paid']);
  assert.equal(plan[0].number, 'F-1038');
  assert.equal(plan.find((p) => p.number === 'F-1029').verdict, 'leave_alone');
  assert.equal(plan.find((p) => p.number === 'F-1045').verdict, 'paid');
  assert.equal(plan.find((p) => p.number === 'F-1046').verdict, 'not_due');
});

test('paid and not-due invoices are never suggested for a follow-up', () => {
  for (const item of todaysPlan(rows, proposals).filter((p) => ['paid', 'not_due'].includes(p.verdict))) {
    assert.equal(item.action, 'Nothing to do');
  }
});

test('client_promises lists only clients who promised or asked to wait', () => {
  assert.deepEqual(clientPromises(rows, proposals).map((p) => p.number), ['F-1038', 'F-1029']);
});

test('a draft is shown only when one is waiting and the client is not on a wait', () => {
  assert.match(draftFor(rows, proposals, 'draft for Marcus').wording, /8 November/);
  assert.equal(draftFor(rows, proposals, 'draft for Priya').wording, null);
  assert.equal(draftFor(rows, proposals, 'nobody at all'), null);
});

test('assistant refuses every action verb, however it is phrased', () => {
  for (const text of ['send the reminder to Amelia', 'Approve F-1042', 'please pay it', 'refund Marcus', 'delete the draft', 'cancel F-1029']) {
    const reply = answer(text, rows, proposals);
    assert.equal(reply.title, 'I cannot do that', text);
  }
});

test('assistant answers from the rows and tolerates empty or hostile input', () => {
  assert.match(answer('Who should I chase today?', rows, proposals).lines[0], /Follow up: Marcus Osei/);
  assert.equal(answer('anything', [], []).title, 'No invoices loaded');
  assert.equal(answer(undefined, rows, proposals).title, 'Ask about your invoices');
  assert.equal(answer('<script>alert(1)</script>', rows, proposals).title, 'Ask about your invoices');
  assert.equal(findRow(rows, ''), null);
  assert.doesNotThrow(() => answer('x'.repeat(100000), rows, proposals));
});

test('MCP server exposes the decision tools, stays read only, and rejects bad arguments', async () => {
  const root = mkdtempSync(join(tmpdir(), 'oweleaf-mcp-'));
  cpSync(resolve('src'), join(root, 'src'), { recursive: true });
  cpSync(resolve('package.json'), join(root, 'package.json'));
  const port = 6500 + Math.floor(Math.random() * 900);
  const env = { ...process.env, FARTHING_MOCK: '1', BRAIN_PROVIDER: 'heuristic', FARTHING_AUTH_MODE: 'open-fixture', OWELEAF_DEMO_SEED: '1', PORT: String(port) };
  const server = spawn(process.execPath, ['src/server.js'], { cwd: root, env, stdio: 'ignore' });
  let mcp;
  try {
    for (let n = 0; n < 100; n++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/api/desk`)).ok) break; } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 40));
    }
    await fetch(`http://127.0.0.1:${port}/api/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    mcp = spawn(process.execPath, ['src/mcp-server.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['pipe', 'pipe', 'ignore'] });
    const pending = new Map();
    createInterface({ input: mcp.stdout }).on('line', (line) => { const m = JSON.parse(line); pending.get(m.id)?.(m); pending.delete(m.id); });
    let id = 0;
    const rpc = (method, params = {}) => new Promise((resolveRpc, reject) => {
      const n = ++id;
      const timer = setTimeout(() => reject(new Error('MCP timeout')), 5000);
      pending.set(n, (m) => { clearTimeout(timer); resolveRpc(m); });
      mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n');
    });
    const init = await rpc('initialize');
    assert.equal(init.result.serverInfo.name, 'oweleaf-read-only');
    const listed = (await rpc('tools/list')).result.tools;
    for (const name of ['todays_plan', 'client_promises', 'draft_for']) {
      const tool = listed.find((t) => t.name === name);
      assert.ok(tool, name);
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.destructiveHint, false);
    }
    assert.equal(listed.some((t) => /send|approve|remind/i.test(t.name)), false, 'no tool can send');

    const plan = JSON.parse((await rpc('tools/call', { name: 'todays_plan', arguments: {} })).result.content[0].text);
    assert.match(plan.provenance, /Nothing was sent/);
    assert.equal(plan.data[0].verdict, 'follow_up_broken_promise');
    assert.equal(plan.data[0].payer, 'Marcus Osei');

    const promises = JSON.parse((await rpc('tools/call', { name: 'client_promises', arguments: {} })).result.content[0].text);
    assert.deepEqual(promises.data.map((p) => p.payer), ['Marcus Osei', 'Priya Nair']);

    const draft = JSON.parse((await rpc('tools/call', { name: 'draft_for', arguments: { query: 'Marcus' } })).result.content[0].text);
    assert.match(draft.data.wording, /You mentioned payment for invoice F-1038/);

    assert.ok((await rpc('tools/call', { name: 'draft_for', arguments: {} })).error, 'query required');
    assert.ok((await rpc('tools/call', { name: 'todays_plan', arguments: { query: 'x' } })).error, 'no arguments allowed');
    assert.ok((await rpc('tools/call', { name: 'approve_reminder', arguments: {} })).error, 'unknown tool refused');
  } finally {
    mcp?.kill();
    server.kill();
    await new Promise((r) => setTimeout(r, 150));
    try { rmSync(root, { recursive: true, force: true }); } catch { /* temp dir on Windows may still be locked */ }
  }
});

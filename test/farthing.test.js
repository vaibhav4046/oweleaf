// Real tests: full loop against the fixture PayPal book, tone-ladder unit tests,
// prompt-parser adversarial inputs, and eval-harness integrity. node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invoiceSummary, overdueDays } from '../src/paypal.js';
import { decideHeuristic, toneForDays } from '../src/brain/heuristic.js';
import { buildDecisionPrompt, parseDecision } from '../src/brain/prompts.js';
import { MockPayPalClient, fixtureInvoices } from '../src/mock-paypal.js';
import { createBrain } from '../src/brain/index.js';
import { scan, approve, reject } from '../src/agent.js';

const noTrace = () => {};
const freshState = () => ({ proposals: [], actions: [], history: {} });

test('overdueDays: past due positive, future due negative, missing null', () => {
  assert.equal(overdueDays({ due_date: { date: '2026-11-01' } }, new Date('2026-11-10T00:00:00Z')), 9);
  assert.equal(overdueDays({ due_date: { date: '2026-11-20' } }, new Date('2026-11-10T00:00:00Z')), -10);
  assert.equal(overdueDays({}, new Date()), null);
});

test('invoiceSummary: SENT + past due is chaseable; PAID and not-yet-due are not', () => {
  const inv = fixtureInvoices();
  const s = inv.map((i) => invoiceSummary(i));
  const chaseable = s.filter((x) => x.chaseable).map((x) => x.number);
  assert.deepEqual(chaseable.sort(), ['F-1029', 'F-1038', 'F-1042']);
  assert.equal(s.find((x) => x.number === 'F-1045').chaseable, false); // PAID
  assert.equal(s.find((x) => x.number === 'F-1046').chaseable, false); // future due
});

test('tone ladder boundaries: 7 gentle, 8 firm, 21 firm, 22 final', () => {
  assert.equal(toneForDays(1), 'gentle');
  assert.equal(toneForDays(7), 'gentle');
  assert.equal(toneForDays(8), 'firm');
  assert.equal(toneForDays(21), 'firm');
  assert.equal(toneForDays(22), 'final');
});

test('heuristic brain: waits on non-chaseable, drafts within tone templates', () => {
  const s = { number: 'X-1', status: 'SENT', chaseable: true, daysOverdue: 12, payerName: 'Marcus Osei', amount: '10.00', currency: 'GBP', dueDate: '2026-10-29' };
  const d = decideHeuristic(s);
  assert.equal(d.action, 'remind');
  assert.equal(d.tone, 'firm');
  assert.match(d.subject, /X-1/);
  assert.match(d.note, /Marcus/);
  const w = decideHeuristic({ ...s, chaseable: false });
  assert.equal(w.action, 'wait');
});

test('parseDecision: accepts clean JSON, rejects slop and threats schema', () => {
  assert.equal(parseDecision('{"action":"remind","tone":"gentle","subject":"s","note":"n","reasoning":"r"}').tone, 'gentle');
  assert.equal(parseDecision('sure! here is your json: {"action":"wait","reasoning":"ok"}').action, 'wait');
  assert.equal(parseDecision('{"action":"remind","tone":"nasty","subject":"s","note":"n"}'), null); // bad tone fails closed
  assert.equal(parseDecision('{"action":"remind"}'), null); // missing draft fails closed
  assert.equal(parseDecision('no json at all'), null);
  assert.equal(parseDecision(''), null);
});

test('SLM fallback: unreachable ollama host fails closed to heuristic', async () => {
  const brain = createBrain({ provider: 'ollama', ollamaHost: 'http://127.0.0.1:9', ollamaModel: 'x' });
  const d = await brain.decide({ number: 'X-2', status: 'SENT', chaseable: true, daysOverdue: 30, payerName: 'Priya Nair', amount: '1.00', currency: 'GBP', dueDate: '2026-10-11' });
  assert.equal(d.fallback, true);
  assert.equal(d.action, 'remind');
  assert.equal(d.tone, 'final');
});

test('full loop: scan queues exactly the chaseable invoices, approve sends via PayPal, no duplicates on rescan', async () => {
  const paypal = new MockPayPalClient();
  const brain = createBrain({ provider: 'heuristic' });
  const state = freshState();
  const r1 = await scan({ paypal, brain, state, tracer: noTrace });
  assert.equal(r1.scanned.length, 5);
  assert.equal(r1.newProposals.length, 3);
  const tones = Object.fromEntries(r1.newProposals.map((p) => [p.invoiceNumber, p.tone]));
  assert.deepEqual(tones, { 'F-1042': 'gentle', 'F-1038': 'firm', 'F-1029': 'final' });

  // rescan: no duplicate proposals for pending invoices
  const r2 = await scan({ paypal, brain, state, tracer: noTrace });
  assert.equal(r2.newProposals.length, 0);

  // approve one: PayPal remind called with the drafted subject/note
  const p = r1.newProposals[0];
  const { proposal } = await approve({ paypal, state, proposalId: p.id, tracer: noTrace });
  assert.equal(proposal.status, 'approved');
  assert.equal(paypal.calls.length, 1);
  assert.equal(paypal.calls[0].type, 'remind');
  assert.equal(paypal.calls[0].subject, p.subject);

  // history recorded; double-approve refused
  assert.equal(state.history[p.invoiceId].length, 1);
  await assert.rejects(() => approve({ paypal, state, proposalId: p.id, tracer: noTrace }), /approved/);

  // reject flow
  const p2 = r1.newProposals[1];
  reject({ state, proposalId: p2.id });
  assert.equal(state.proposals.find((x) => x.id === p2.id).status, 'rejected');
  await assert.rejects(() => approve({ paypal, state, proposalId: p2.id, tracer: noTrace }), /rejected/);
});

test('chaser copy never threatens and never invents discounts (template scan)', () => {
  const s = { number: 'X-9', status: 'SENT', chaseable: true, daysOverdue: 40, payerName: 'A B', amount: '5.00', currency: 'GBP', dueDate: '2026-10-01' };
  const d = decideHeuristic(s);
  const text = `${d.subject}\n${d.note}`.toLowerCase();
  for (const banned of ['legal action', 'sue', 'discount', 'waive', 'collections agency']) {
    assert.ok(!text.includes(banned), `template must not contain "${banned}"`);
  }
});

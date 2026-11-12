// A wait note can carry the day a client promised to pay. Reminders stay blocked
// through that day, lift by themselves afterwards, and the follow-up cites the promise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setHold, policyBlock, promiseStatus, explain, controls } from '../src/desk.js';
import { scan } from '../src/agent.js';
import { MockPayPalClient } from '../src/mock-paypal.js';
import { invoiceSummary } from '../src/paypal.js';
import { decideHeuristic } from '../src/brain/heuristic.js';

const fresh = () => ({ proposals: [], actions: [], history: {} });
const tracer = () => {};
const MARCUS = 'marcus@lumenworks.example';
const dayOffset = (now, n) => new Date(now.getTime() + n * 86400000).toISOString().slice(0, 10);
const overdueInvoice = (now) => {
  const all = new MockPayPalClient().invoices.map((i) => invoiceSummary(i, now));
  return all.find((i) => i.payerEmail === MARCUS && i.chaseable);
};
// Fails the test if the model path is used where the rules must write the wording.
const modelMustNotRun = { decide: async () => { throw new Error('model called for a promise follow-up'); } };
const rulesBrain = { decide: async (s) => ({ ...decideHeuristic(s), provider: 'heuristic', model: 'rules', latencyMs: 0 }) };

test('dated promise blocks through the promised day and lifts the day after', () => {
  const now = new Date();
  const state = fresh();
  const invoice = overdueInvoice(now);
  const promised = dayOffset(now, 1);
  setHold(state, MARCUS, 'Will pay Friday', promised, now);

  assert.match(policyBlock(state, invoice, now), new RegExp(`Payer hold until ${promised}`));
  assert.match(policyBlock(state, invoice, new Date(`${promised}T23:59:00Z`)), /Payer hold until/);
  assert.equal(policyBlock(state, invoice, new Date(`${dayOffset(now, 2)}T00:01:00Z`)), null);
});

test('undated wait note never lifts by itself', () => {
  const now = new Date();
  const state = fresh();
  setHold(state, MARCUS, 'Waiting for a reply', undefined, now);

  assert.equal(promiseStatus(controls(state).holds[MARCUS], now), null);
  assert.match(policyBlock(state, overdueInvoice(now), new Date(now.getTime() + 365 * 86400000)), /^Payer hold: Waiting for a reply$/);
});

test('promised date must be real, not in the past, and at most a year ahead', () => {
  const now = new Date('2026-11-12T10:00:00Z');
  for (const bad of ['2026-11-11', '2026-02-30', '12/11/2026', 'tomorrow', '2027-12-01', 20261113]) {
    assert.throws(() => setHold(fresh(), MARCUS, 'Promise', bad, now), /Promised date/, String(bad));
  }
  assert.doesNotThrow(() => setHold(fresh(), MARCUS, 'Promise', '2026-11-12', now));
});

test('no draft while the promise is open; rules follow-up cites the date once it passes', async () => {
  const made = new Date();
  const state = fresh();
  setHold(state, MARCUS, 'Will pay Friday', dayOffset(made, 1), made);

  const during = await scan({ paypal: new MockPayPalClient(), brain: rulesBrain, state, now: made, tracer });
  assert.equal(during.newProposals.some((p) => p.payerEmail === MARCUS), false);

  // Only Marcus is eligible now, so any model call would be for his promise follow-up.
  state.proposals.length = 0;
  for (const email of ['amelia@northwind.example', 'priya@kilnbakery.example']) setHold(state, email, 'Unrelated wait', undefined, made);
  const later = new Date(made.getTime() + 3 * 86400000);
  const paypal = new MockPayPalClient();
  const after = await scan({ paypal, brain: modelMustNotRun, state, now: later, tracer });
  const proposal = after.newProposals.find((p) => p.payerEmail === MARCUS);

  assert.ok(proposal, 'a follow-up is prepared after the promised day');
  assert.deepEqual(proposal.promise, { until: dayOffset(made, 1), passed: true, daysPast: 2 });
  assert.match(proposal.note, /You mentioned payment for invoice/);
  const promisedLong = new Date(`${dayOffset(made, 1)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  assert.ok(proposal.note.includes(promisedLong), 'wording names the promised day');
  assert.match(proposal.model, /promise follow-up/);
  assert.equal(explain(state, overdueInvoice(later), later).hold.passed, true);
});

test('a passed promise only prepares a pending draft; the scan sends nothing', async () => {
  const made = new Date();
  const state = fresh();
  setHold(state, MARCUS, 'Will pay tomorrow', dayOffset(made, 1), made);
  const paypal = new MockPayPalClient();
  const later = new Date(made.getTime() + 2 * 86400000);
  const { newProposals } = await scan({ paypal, brain: rulesBrain, state, now: later, tracer });
  const proposal = newProposals.find((p) => p.payerEmail === MARCUS);

  assert.equal(paypal.calls.length, 0, 'nothing is sent by the scan');
  assert.equal(proposal.status, 'pending');
});

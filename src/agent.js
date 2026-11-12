// The Farthing agent loop: scan invoices, decide per overdue invoice, queue
// proposals for human approval, execute approved ones through PayPal.
// Proactive by design: run --once for a single scan, or the server runs it on
// SCAN_INTERVAL_MINUTES. Nothing ever sends without an approval click.

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { invoiceSummary } from './paypal.js';
import { policyBlock, audit } from './desk.js';
import { trace } from './harness/trace.js';

import {readLedger} from './persistence.js';
const DB_FILE = resolve('data/state.json');

export function loadState() {
  const state=readLedger(DB_FILE,{proposals:[],actions:[],history:{}},s=>s&&Array.isArray(s.proposals)&&Array.isArray(s.actions)&&s.history&&typeof s.history==='object');
  let recovered=false;
  for(const p of state.proposals){if(['checking','sending'].includes(p.status)){p.status='delivery_unknown';p.error='Process interrupted during approval. Check provider history before recording a resolution.';recovered=true;}}
  if(recovered){audit(state,'restart_recovery','Interrupted approvals marked delivery_unknown; no replay or resend');saveState(state);}
  return state;
}

export function saveState(state) {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  // Tests and real requests can persist concurrently. A shared fixed temp
  // name lets one writer rename another writer's temp file out from under it.
  // Use a unique sibling so each rename remains atomic and independent.
  const temporary = `${DB_FILE}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(state, null, 2));
  renameSync(temporary, DB_FILE);
}

const scanning = new WeakSet();
// One scan: summarise all invoices, decide for each chaseable one, queue proposals.
// Already-pending proposals for the same invoice are not duplicated.
export async function scan({ paypal, brain, state, now = new Date(), tracer = trace }) {
  if (state.paused) return { scanned: [], newProposals: [], paused: true };
  if (scanning.has(state)) return { scanned: [], newProposals: [], busy: true };
  scanning.add(state);
  try {
  const invoices = await paypal.listInvoices();
  const summaries = invoices.map((inv) => invoiceSummary(inv, now));
  const proposals = [];
  for (const s of summaries) {
    const pending = state.proposals.some((p) => p.invoiceId === s.id && ['pending','checking','sending','delivery_unknown'].includes(p.status));
    if (!s.chaseable || pending || policyBlock(state,s,now)) continue;
    const history = state.history[s.id] || [];
    const recent = state.actions.some(a => a.invoiceId === s.id && now - new Date(a.at) < 86400000);
    if (recent) continue;
    const decision = await brain.decide(s, history);
    tracer({
      kind: 'decision', invoiceId: s.id, invoiceNumber: s.number,
      provider: decision.provider, model: decision.model, fallback: decision.fallback,
      action: decision.action, tone: decision.tone, latencyMs: Math.round(decision.latencyMs),
      tokensIn: decision.tokensIn, tokensOut: decision.tokensOut, reasoning: decision.reasoning,
    });
    if (decision.action !== 'remind' || state.paused || policyBlock(state,s,now)) continue;
    const proposal = {
      id: `P-${Date.now()}-${s.number}`,
      invoiceId: s.id,
      invoiceNumber: s.number,
      payerName: s.payerName,
      payerEmail: s.payerEmail,
      amount: s.amount,
      currency: s.currency,
      daysOverdue: s.daysOverdue,
      tone: decision.tone,
      subject: decision.subject,
      note: decision.note,
      reasoning: decision.reasoning,
      provider: decision.provider,
      model: decision.model,
      fallback: !!decision.fallback,
      fallbackReason: decision.fallbackReason||null,
      status: 'pending',
      createdAt: now.toISOString(),
    };
    state.proposals.push(proposal);
    proposals.push(proposal);
  }
  state.lastScanAt = now.toISOString();
  audit(state,'scan',`${summaries.length} invoices read; ${proposals.length} new drafts; no automatic sends`);
  saveState(state);
  return { scanned: summaries, newProposals: proposals };
  } finally { scanning.delete(state); }
}

// Execute an approved proposal: the chaser goes out through PayPal's /remind.
export async function approve({ paypal, state, proposalId, tracer = trace }) {
  const p = state.proposals.find((x) => x.id === proposalId);
  if (!p) throw new Error(`no proposal ${proposalId}`);
  if (p.status !== 'pending') throw new Error(`proposal ${proposalId} is ${p.status}`);
  if (state.paused) throw new Error('Agent is paused');
  // Claim before the first await, so concurrent clicks cannot both send.
  p.status = 'checking';
  saveState(state);
  let current;
  try { current = invoiceSummary(await paypal.getInvoice(p.invoiceId)); }
  catch (e) { p.status = 'pending'; saveState(state); throw e; }
  if (!current.chaseable || current.amount !== p.amount || current.currency !== p.currency || current.payerEmail !== p.payerEmail || current.number !== p.invoiceNumber) {
    p.status = 'stale'; audit(state,'approval_blocked',`${p.invoiceNumber}: current invoice changed`);saveState(state);
    throw new Error('Invoice changed or is no longer overdue. Draft blocked; rescan for a fresh proposal.');
  }
  const blocked=policyBlock(state,current);
  if(blocked){p.status='pending';audit(state,'approval_blocked',`${p.invoiceNumber}: ${blocked}`);saveState(state);throw new Error(blocked);}
  if (state.paused) { p.status = 'pending'; saveState(state); throw new Error('Agent was paused during preflight'); }
  p.status = 'sending'; saveState(state);
  let result;
  try { result = await paypal.remind(p.invoiceId, { subject: p.subject, note: p.note }); }
  catch (e) {
    // A timeout may mean the provider sent it. Never retry blindly.
    p.status = 'delivery_unknown'; p.error = 'Check provider history before retrying';audit(state,'delivery_unknown',`${p.invoiceNumber}: provider outcome uncertain; manual history check needed`);
    saveState(state); throw e;
  }
  audit(state,'reminder_recorded',`${p.invoiceNumber}: provider returned success; ${p.currency} ${p.amount}. Not proof of payment.`);
  p.status = 'approved';
  p.executedAt = new Date().toISOString();
  (state.history[p.invoiceId] ||= []).push({
    date: p.executedAt.slice(0, 10),
    event: `${p.tone} reminder sent for invoice ${p.invoiceNumber} (${p.currency} ${p.amount}, ${p.daysOverdue}d overdue)`,
  });
  state.actions.push({ proposalId: p.id, type: 'remind', invoiceId: p.invoiceId, at: p.executedAt });
  tracer({ kind: 'action', action: 'remind', invoiceId: p.invoiceId, invoiceNumber: p.invoiceNumber, tone: p.tone, subject: p.subject });
  saveState(state);
  return { proposal: p, result };
}

export function reject({ state, proposalId }) {
  const p = state.proposals.find((x) => x.id === proposalId);
  if (!p) throw new Error(`no proposal ${proposalId}`);
  if (p.status !== 'pending') throw new Error(`proposal ${proposalId} is ${p.status}`);
  p.status = 'rejected';
  audit(state,'draft_rejected',p.invoiceNumber);
  saveState(state);
  return p;
}

// Manual recovery never replays the uncertain request or reopens the old draft.
export async function reconcileDelivery({paypal,state,proposalId,outcome,evidence,confirmed}) {
 const p=state.proposals.find(x=>x.id===proposalId);
 if(!p||p.status!=='delivery_unknown')throw Error('Only uncertain deliveries can be reconciled');
 if(confirmed!==true||!['sent','not_sent'].includes(outcome)||typeof evidence!=='string'||evidence.trim().length<12||evidence.length>500)throw Error('Check provider history, choose sent/not sent, and record at least 12 characters of evidence');
 const current=invoiceSummary(await paypal.getInvoice(p.invoiceId));
 // Provider read proves current source access, not delivery. Owner evidence is manual.
 p.status='reconciled';p.reconciliation={outcome,evidence:evidence.trim(),at:new Date().toISOString(),sourceStatus:current.status,manual:true};
 state.actions.push({proposalId:p.id,invoiceId:p.invoiceId,type:'manual_delivery_reconciliation',at:p.reconciliation.at});
 audit(state,'delivery_reconciled',p.invoiceNumber+': owner recorded '+outcome+'; no resend;24h cooldown');saveState(state);return p;
}

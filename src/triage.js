// Reply triage: the client answered a reminder. The model reads what they said, the agent
// checks that claim against PayPal itself, and fixed rules decide what to propose.
// Nothing here sends, holds or marks anything. Every proposal needs a person to confirm it.
import { readClientReply } from './brain/reply.js';
import { invoiceSummary } from './paypal.js';

const PAID_STATUSES = ['PAID', 'MARKED_AS_PAID'];
const DISPUTE_REVIEW_DAYS = 7;
// Backstop when no model is available: rules alone only find dates, so catch the two
// claims that change what to do next. A model answer always takes precedence.
const PAID_WORDS = /\b(already paid|have paid|has been paid|we paid|i paid|paid (it|this|yesterday|today|last)|sent (it|the payment|payment)|transferred|payment (was )?(sent|made))\b/i;
const PROBLEM_WORDS = /\b(wrong|incorrect|dispute|too high|overcharg\w*|not (what we )?agreed|didn'?t receive|never received|not happy|query)\b/i;

const isoDay = (date) => date.toISOString().slice(0, 10);
const addDays = (now, days) => isoDay(new Date(now.getTime() + days * 86400000));
const money = (currency, value) => (value === null || value === undefined ? null : `${currency} ${Number(value).toFixed(2)}`);

// A "paid" reading must be backed by payment words in the message itself, the same way a
// date must be quoted. Measured on qwen3:1.7b against Sandbox: it read "Thanks, noted." as paid.
const PAID_EVIDENCE = /\b(paid|sent|transferr?ed|went out|gone out|settled|cleared|remitted|wired|payment (was |has been )?made)\b/i;

function finalKind(read, text) {
  if (read.provider === 'rules') {
    if (PROBLEM_WORDS.test(text)) return { kind: 'problem', note: null };
    if (PAID_WORDS.test(text)) return { kind: 'already_paid', note: null };
    return { kind: read.kind, note: null };
  }
  if (read.kind === 'already_paid' && !PAID_EVIDENCE.test(text)) return { kind: 'other', note: 'Model read a payment claim but the message has no payment words; ignored' };
  return { kind: read.kind, note: null };
}

function paymentFacts(invoice) {
  const paid = invoice.payments?.paid_amount?.value ?? null;
  const transactions = invoice.payments?.transactions || [];
  const last = transactions[transactions.length - 1] || null;
  return { paid: paid === null ? null : Number(paid), lastPaymentDate: last?.payment_date || null, count: transactions.length };
}

/**
 * Decide what to propose. Pure: same inputs, same answer.
 * @param {{kind:string,date:string|null}} reading what the client said
 * @param {object} summary invoiceSummary of the invoice as PayPal returns it now
 * @param {{paid:number|null,lastPaymentDate:string|null}} facts payments PayPal has recorded
 * @param {string|null} payLink PayPal's own payment page for this invoice
 */
export function decide(reading, summary, facts, payLink, now = new Date()) {
  const due = money(summary.currency, summary.amount);
  const who = summary.payerName.split(' ')[0] || 'there';
  const link = payLink ? ` You can pay it here: ${payLink}` : '';
  const holdFor = (until, reason) => ({ action: 'hold', email: summary.payerEmail, until, reason });

  if (PAID_STATUSES.includes(summary.status)) {
    return { verdict: 'paid_confirmed', headline: `PayPal confirms ${summary.number} is paid`, why: `PayPal status is ${summary.status}${facts.lastPaymentDate ? `, last payment ${facts.lastPaymentDate}` : ''}. Stop chasing.`, proposal: { action: 'stop_chasing' }, replyDraft: `Hi ${who}, thank you, payment for invoice ${summary.number} has arrived.` };
  }
  if (reading.kind === 'already_paid') {
    if (summary.status === 'PARTIALLY_PAID') {
      return { verdict: 'partial_payment', headline: `Client says paid; PayPal shows part paid`, why: `PayPal has ${money(summary.currency, facts.paid) || 'a part payment'} recorded and ${due} still due.`, proposal: { action: 'none' }, replyDraft: `Hi ${who}, thank you for the payment on invoice ${summary.number}. PayPal shows ${due} still outstanding. Could you check whether a second payment is on its way?${link}` };
    }
    return { verdict: 'paid_claim_not_in_paypal', headline: `Client says paid; PayPal has no payment yet`, why: `PayPal status is ${summary.status} with ${due} due. A bank transfer can take a few days, so ask for the reference instead of sending another reminder.`, proposal: holdFor(addDays(now, 3), 'Client says paid; checking with PayPal'), replyDraft: `Hi ${who}, thanks for letting me know. I can't see the payment for invoice ${summary.number} (${due}) yet. Could you send me the payment reference so I can match it?${link}` };
  }
  if (reading.kind === 'problem') {
    return { verdict: 'dispute', headline: `Client is questioning ${summary.number}`, why: 'A reminder will not help while the invoice is disputed. Pause chasing and reply in person.', proposal: holdFor(addDays(now, DISPUTE_REVIEW_DAYS), 'Client questioned the invoice; reply in person'), replyDraft: `Hi ${who}, thanks for raising this. Let me look at invoice ${summary.number} again and come back to you. I won't send any reminders in the meantime.` };
  }
  if ((reading.kind === 'promise' || reading.kind === 'needs_time') && reading.date) {
    return { verdict: reading.kind, headline: `Client will pay by ${reading.date}`, why: `Hold reminders until ${reading.date}. If PayPal still shows it unpaid after that, the promise is broken and Oweleaf drafts a follow-up quoting it.`, proposal: holdFor(reading.date, reading.kind === 'promise' ? 'Client promised to pay' : 'Client asked for more time'), replyDraft: `Hi ${who}, thanks, ${reading.date} works for invoice ${summary.number} (${due}).${link}` };
  }
  if (reading.kind === 'promise' || reading.kind === 'needs_time') {
    return { verdict: 'needs_date', headline: 'Client will pay but gave no date', why: 'Ask for a date so the promise can be tracked.', proposal: { action: 'none' }, replyDraft: `Hi ${who}, thanks for coming back to me on invoice ${summary.number}. Which date should I expect payment?${link}` };
  }
  return { verdict: 'no_action', headline: 'Nothing in the reply changes the plan', why: 'No payment claim, date or dispute found. The normal reminder schedule stays.', proposal: { action: 'none' }, replyDraft: null };
}

/**
 * Read a client's reply about one invoice and propose the next step.
 * @returns {Promise<object>} triage result with a step trace; `sent` is always false.
 */
export async function triageReply({ invoiceId, text }, { paypal, brainConfig = {}, now = new Date() }) {
  if (typeof invoiceId !== 'string' || !invoiceId.trim() || invoiceId.length > 64) throw Object.assign(new Error('Choose an invoice'), { status: 400 });
  const steps = [];
  const started = performance.now();
  const read = await readClientReply(text, brainConfig, now);
  const { kind, note } = finalKind(read, text);
  steps.push({ tool: 'read_reply', by: read.provider === 'rules' ? 'fixed rules' : `${read.model} (${read.provider})`, result: { kind, modelKind: read.provider === 'rules' ? null : read.kind, date: read.date, quoted: read.matched, summary: read.summary || null }, fallbackReason: read.fallbackReason || note });

  const invoice = await paypal.getInvoice(invoiceId);
  if (!invoice) throw Object.assign(new Error('Invoice not found in PayPal'), { status: 404 });
  const summary = invoiceSummary(invoice, now);
  const facts = paymentFacts(invoice);
  steps.push({ tool: 'paypal.getInvoice', by: 'PayPal Invoicing API', result: { number: summary.number, status: summary.status, due: money(summary.currency, summary.amount), paid: money(summary.currency, facts.paid), payments: facts.count } });

  const decision = decide({ kind, date: read.date }, summary, facts, invoice.detail?.metadata?.recipient_view_url || null, now);
  steps.push({ tool: 'decide', by: 'fixed rules', result: { verdict: decision.verdict, proposal: decision.proposal.action } });
  return { invoice: { id: summary.id, number: summary.number, status: summary.status, payerName: summary.payerName }, reading: { ...read, kind }, ...decision, steps, latencyMs: Math.round(performance.now() - started), sent: false };
}

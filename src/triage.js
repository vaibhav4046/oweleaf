// Reply triage: the client answered a reminder. The model reads what they said, the agent
// checks that claim against PayPal itself, and fixed rules decide what to propose.
// Nothing here sends, holds or marks anything. Every proposal needs a person to confirm it.
import { readClientReply } from './brain/reply.js';
import { invoiceSummary } from './paypal.js';
import { finalKind, decide } from './public/triage-core.js';

export { decide };

const money = (currency, value) => (value === null || value === undefined ? null : `${currency} ${Number(value).toFixed(2)}`);

function paymentFacts(invoice) {
  const paid = invoice.payments?.paid_amount?.value ?? null;
  const transactions = invoice.payments?.transactions || [];
  const last = transactions[transactions.length - 1] || null;
  return { paid: paid === null ? null : Number(paid), lastPaymentDate: last?.payment_date || null, count: transactions.length };
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

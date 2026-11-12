// One decision model shared by the dashboard assistant and the MCP tools, so a
// freelancer, Claude and ChatGPT all get the same answer from the same facts.
// Pure functions over desk rows and proposals. Deterministic rules, no language model,
// and nothing here can send, approve or change anything.

/**
 * @typedef {{id:string,number:string,payerName:string,payerEmail:string,amount:string|number,currency:string,daysOverdue:number,chaseable:boolean,status:string}} Invoice
 * @typedef {{reason:string,until?:string,passed?:boolean,daysPast?:number}} Hold
 * @typedef {{invoice:Invoice,hold:Hold|null}} Row
 * @typedef {{invoiceId:string,status:string,subject?:string,note?:string}} Proposal
 * @typedef {{number:string,payer:string,amount:string,verdict:string,action:string,reason:string}} PlanItem
 */

const ORDER = ['follow_up_broken_promise', 'review_reminder', 'leave_alone', 'reminder_sent', 'not_due', 'paid'];
const ACTION = {
  follow_up_broken_promise: 'Follow up',
  review_reminder: 'Review reminder',
  leave_alone: 'Leave alone',
  reminder_sent: 'Nothing to do',
  not_due: 'Nothing to do',
  paid: 'Nothing to do',
};

const money = (invoice) => {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: invoice.currency }).format(Number(invoice.amount));
  } catch {
    return `${invoice.currency} ${invoice.amount}`;
  }
};
const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const latest = (proposals, invoiceId) => proposals.filter((p) => p.invoiceId === invoiceId).at(-1) || null;

/** @param {Row} row @param {Proposal[]} proposals @returns {PlanItem} */
function judge(row, proposals) {
  const { invoice, hold } = row;
  const proposal = latest(proposals, invoice.id);
  const base = { number: invoice.number, payer: invoice.payerName, amount: money(invoice) };
  const item = (verdict, reason) => ({ ...base, verdict, action: ACTION[verdict], reason });

  if (!invoice.chaseable) {
    return String(invoice.status).toUpperCase().includes('PAID')
      ? item('paid', 'Paid. It cannot be chased.')
      : item('not_due', 'Not due yet. It cannot be chased.');
  }
  if (proposal?.status === 'approved') return item('reminder_sent', 'You already approved a reminder for this invoice.');
  if (hold && !hold.passed) {
    return item('leave_alone', hold.until
      ? `They promised payment by ${day(hold.until)}. No reminder can go before then. Your note: ${hold.reason}`
      : `You asked to wait. Your note: ${hold.reason}`);
  }
  if (hold?.passed) {
    const ready = proposal?.status === 'pending' ? 'A follow-up that mentions their date is ready for you to read.' : 'Check invoices to prepare the follow-up.';
    return item('follow_up_broken_promise', `Promised by ${day(hold.until)}, ${plural(hold.daysPast, 'day')} ago, and still unpaid. ${ready}`);
  }
  if (proposal?.status === 'rejected') return item('review_reminder', `${plural(invoice.daysOverdue, 'day')} late. You dismissed the last draft; restore it to review again.`);
  return item('review_reminder', `${plural(invoice.daysOverdue, 'day')} late and no reply noted. ${proposal?.status === 'pending' ? 'A reminder is ready for you to read.' : 'Check invoices to prepare a reminder.'}`);
}

/** Every invoice with what to do about it today, most urgent first. @returns {PlanItem[]} */
export function todaysPlan(rows, proposals = []) {
  return rows.map((row) => judge(row, proposals)).sort((a, b) => ORDER.indexOf(a.verdict) - ORDER.indexOf(b.verdict));
}

/** Clients who gave a promise or asked to wait, broken promises first. @returns {PlanItem[]} */
export function clientPromises(rows, proposals = []) {
  return todaysPlan(rows.filter((row) => row.hold), proposals).filter((i) => ['follow_up_broken_promise', 'leave_alone'].includes(i.verdict));
}

/** Find one invoice by number or by any part of the payer's name. @returns {Row|null} */
export function findRow(rows, query) {
  const q = String(query || '').toLowerCase();
  if (!q.trim()) return null;
  return rows.find((r) => q.includes(r.invoice.number.toLowerCase()))
    || rows.find((r) => r.invoice.payerName.toLowerCase().split(/\s+/).some((part) => part.length > 2 && q.includes(part)))
    || null;
}

/** The wording prepared for one invoice, if a draft is waiting for review. */
export function draftFor(rows, proposals, query) {
  const row = findRow(rows, query);
  if (!row) return null;
  const proposal = latest(proposals, row.invoice.id);
  const plan = judge(row, proposals);
  if (proposal?.status !== 'pending' || plan.verdict === 'leave_alone') return { ...plan, subject: null, wording: null };
  return { ...plan, subject: proposal.subject, wording: proposal.note };
}

const line = (i) => `${i.action}: ${i.payer}, ${i.number}, ${i.amount}. ${i.reason}`;
const HELP = ['Who should I chase today?', 'What did clients promise?', 'Why Marcus?', 'Show the draft for Marcus'];

/**
 * Answer a plain-language question from the invoices on screen.
 * @returns {{title:string,lines:string[],suggestions:string[]}}
 */
export function answer(text, rows, proposals = []) {
  const q = String(text || '').toLowerCase().trim().slice(0, 300);
  const reply = (title, lines) => ({ title, lines, suggestions: HELP });
  if (!rows.length) return reply('No invoices loaded', ['Press "Check invoices" first.']);
  if (/\b(send|approve|pay|refund|delete|cancel|charge)\b/.test(q)) {
    return reply('I cannot do that', ['I only read and explain. Open the invoice and press approve yourself. Every reminder needs your own click.']);
  }
  const row = findRow(rows, q);
  if (row && /\b(draft|wording|words|write|message|email|say)\b/.test(q)) {
    const d = draftFor(rows, proposals, q);
    return d.wording
      ? reply(`Draft for ${d.payer}, ${d.number}`, [d.subject, d.wording, 'Not sent. Open the invoice to copy it or approve the PayPal reminder.'])
      : reply(`No draft for ${d.payer}`, [d.reason]);
  }
  if (/\b(promis\w*|said|waiting|wait|holds?)\b/.test(q) && !row) {
    const promises = clientPromises(rows, proposals);
    return promises.length ? reply('What clients promised', promises.map(line)) : reply('No promises noted', ['When a client replies, open their invoice and save a wait note with the date they gave.']);
  }
  if (row) {
    const i = judge(row, proposals);
    return reply(`${i.payer}, ${i.number}: ${i.action.toLowerCase()}`, [i.reason]);
  }
  if (/\b(who|chase|today|plan|brief|overdue|late|should|do)\b/.test(q)) {
    const plan = todaysPlan(rows, proposals);
    const active = plan.filter((i) => i.action !== 'Nothing to do');
    const quiet = plan.length - active.length;
    return reply("Today's plan", [...active.map(line), ...(quiet ? [`${plural(quiet, 'invoice')} need nothing: paid, not due, or already reminded.`] : [])]);
  }
  return reply('Ask about your invoices', ['I answer from the invoices on this screen using fixed rules. I am not a general chatbot and I cannot send anything.']);
}

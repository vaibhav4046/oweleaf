// Deterministic fallback brain: the tone-escalation ladder as plain rules.
// Always available, zero dependencies, and the reference behaviour the
// trained SLM is evaluated against in evals/scenarios.json.

export function toneForDays(daysOverdue, gentleMax = 7, firmMax = 21) {
  if (daysOverdue <= gentleMax) return 'gentle';
  if (daysOverdue <= firmMax) return 'firm';
  return 'final';
}

const money = s => new Intl.NumberFormat('en-GB', {style:'currency',currency:s.currency}).format(s.amount);
const date = s => /^\d{4}-\d{2}-\d{2}$/.test(s.dueDate||'') ? new Date(s.dueDate+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}) : 'the agreed date';
const signoff = s => s.senderName || '[Your name]';
const TEMPLATES = {
  gentle: {
    subject: (s) => `Friendly nudge: invoice ${s.number} (${money(s)})`,
    note: (s) =>
      `Hi ${firstName(s.payerName)},\n\nJust a quick nudge - invoice ${s.number} for ${money(s)} was due on ${date(s)} and looks like it may have slipped through. No worries if it is already on its way.\n\nMany thanks,\n${signoff(s)}`,
  },
  firm: {
    subject: (s) => `Overdue: invoice ${s.number} (${money(s)}) - ${s.daysOverdue} days`,
    note: (s) =>
      `Hi ${firstName(s.payerName)},\n\nInvoice ${s.number} for ${money(s)} was due on ${date(s)} and is now ${s.daysOverdue} days overdue. Could you share a payment update, or reply if there is an issue on your side?\n\nThank you,\n${signoff(s)}`,
  },
  final: {
    subject: (s) => `Payment update requested: invoice ${s.number} (${money(s)})`,
    note: (s) =>
      `Hi ${firstName(s.payerName)},\n\nInvoice ${s.number} for ${money(s)} remains unpaid ${s.daysOverdue} days after its due date (${date(s)}). Please share a payment update or reply with any questions.\n\nRegards,\n${signoff(s)}`,
  },
};

function firstName(full) {
  return (full || 'there').split(' ')[0] || 'there';
}

// The heuristic brain decides AND drafts, and explains itself.
export function decideHeuristic(summary, config = {}) {
  const gentleMax = Number(config.gentleMaxDays ?? 7);
  const firmMax = Number(config.firmMaxDays ?? 21);
  if (!summary.chaseable) {
    return { action: 'wait', tone: null, subject: null, note: null, reasoning: `invoice ${summary.number} is not chaseable (status ${summary.status}, ${summary.daysOverdue} days past due)` };
  }
  const tone = toneForDays(summary.daysOverdue, gentleMax, firmMax);
  // The client gave a date and it has passed while the invoice is still unpaid.
  // The follow-up refers to their own promise instead of starting a fresh chase.
  if (summary.promise?.passed) {
    const promised = date({ dueDate: summary.promise.until });
    return {
      action: 'remind',
      tone,
      subject: `Following up: invoice ${summary.number} (${money(summary)})`,
      note: `Hi ${firstName(summary.payerName)},\n\nThanks for your earlier message. You mentioned payment for invoice ${summary.number} (${money(summary)}) by ${promised}. It still shows as unpaid on my side, so I wanted to check where it stands.\n\nMany thanks,\n${signoff(summary)}`,
      reasoning: `client promised payment by ${summary.promise.until}; ${summary.promise.daysPast} day(s) past that date and the invoice is still unpaid`,
    };
  }
  const t = TEMPLATES[tone];
  return {
    action: 'remind',
    tone,
    subject: t.subject(summary),
    note: t.note(summary),
    reasoning: `${summary.daysOverdue} days overdue -> ${tone} tone (gentle <= ${gentleMax}d < firm <= ${firmMax}d < final)`,
  };
}

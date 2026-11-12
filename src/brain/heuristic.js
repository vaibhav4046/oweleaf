// Deterministic fallback brain: the tone-escalation ladder as plain rules.
// Always available, zero dependencies, and the reference behaviour the
// trained SLM is evaluated against in evals/scenarios.json.

export function toneForDays(daysOverdue, gentleMax = 7, firmMax = 21) {
  if (daysOverdue <= gentleMax) return 'gentle';
  if (daysOverdue <= firmMax) return 'firm';
  return 'final';
}

const TEMPLATES = {
  gentle: {
    subject: (s) => `Friendly nudge: invoice ${s.number} (${s.currency} ${s.amount})`,
    note: (s) =>
      `Hi ${firstName(s.payerName)},\n\nJust a quick nudge - invoice ${s.number} for ${s.currency} ${s.amount} was due on ${s.dueDate} and looks like it may have slipped through. No worries if it is already on its way.\n\nMany thanks`,
  },
  firm: {
    subject: (s) => `Overdue: invoice ${s.number} (${s.currency} ${s.amount}) - ${s.daysOverdue} days`,
    note: (s) =>
      `Hi ${firstName(s.payerName)},\n\nInvoice ${s.number} for ${s.currency} ${s.amount} was due on ${s.dueDate} and is now ${s.daysOverdue} days overdue. Could you share a payment update, or reply if there is an issue on your side.\n\nThank you`,
  },
  final: {
    subject: (s) => `Payment update requested: invoice ${s.number} (${s.currency} ${s.amount})`,
    note: (s) =>
      `Hi ${firstName(s.payerName)},\n\nInvoice ${s.number} for ${s.currency} ${s.amount} remains unpaid ${s.daysOverdue} days after its due date (${s.dueDate}). Please share a payment update or contact me with any question.\n\nRegards`,
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
  const t = TEMPLATES[tone];
  return {
    action: 'remind',
    tone,
    subject: t.subject(summary),
    note: t.note(summary),
    reasoning: `${summary.daysOverdue} days overdue -> ${tone} tone (gentle <= ${gentleMax}d < firm <= ${firmMax}d < final)`,
  };
}

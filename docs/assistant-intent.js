// Turns a model-chosen intent into one fixed question that assistant-core.js can answer.
// The model never writes text the user sees. The invoice named is found by rules in the
// user's own words, and only a fixed template is ever passed on.

export const FALLBACK_TITLE = 'Ask about your invoices';

/**
 * @param {string|null} intent one of plan, promises, why, draft, other
 * @param {{invoice:{number:string}}|null} row invoice found by rules in the user's text
 * @returns {string|null} a question assistant-core.js answers, or null to keep the rules' own reply
 */
export function canonicalQuestion(intent, row) {
  if (intent === 'plan') return 'Who should I chase today?';
  if (intent === 'promises') return 'What did clients promise?';
  if (intent === 'why' && row) return `Why ${row.invoice.number}?`;
  if (intent === 'draft' && row) return `Show the draft for ${row.invoice.number}`;
  return null;
}

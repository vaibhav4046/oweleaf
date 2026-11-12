// Bounded, deterministic checks for known factual-invention classes.
// Not semantic proof or prompt-injection immunity. Human review still required.
export function draftIssue(decision, summary) {
 if(decision?.action!=='remind')return null;
 const text=decision.subject+'\n'+decision.note;
 const formatted=new Intl.NumberFormat('en-GB',{style:'currency',currency:summary.currency}).format(summary.amount);
 if(!text.includes(String(summary.number))||!((text.includes(String(summary.amount))&&text.includes(String(summary.currency)))||text.includes(formatted)))return 'Draft omits the exact source invoice, amount or currency';
 if(summary.daysOverdue>0&&/\b(?:before (?:the )?due date|not yet due|not overdue|due in \d+ (?:days?|hours?))\b/i.test(text))return 'Draft contradicts the overdue source status';
 if(/\b(?:was|were|is)\s+sent\s+(?:on|at)\b/i.test(text))return 'Draft invents an invoice sent date';
 if(/\b(?:this week|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|immediately|urgently|as soon as possible)\b/i.test(text))return 'Draft adds unsupported urgency or a new payment deadline';
 if(/\b(?:within|in the next)\s+\d+\s+(?:days?|hours?)\b/i.test(text))return 'Draft invents a new payment deadline';
 if(/\b(?:promised|agreed|discount|lawsuit|legal action|bailiff|court|bank account|sort code)\b/i.test(text))return 'Draft contains an unsupported promise, term or payment instruction';
 if(/https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))return 'Draft adds an unapproved contact or payment destination';
 const dates=text.match(/\b\d{4}-\d{2}-\d{2}\b/g)||[];
 if(dates.some(d=>d!==summary.dueDate))return 'Draft adds a date not supplied in the source';
 return null;
}

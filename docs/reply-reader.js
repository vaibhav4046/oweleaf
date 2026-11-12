// Reads the payment date out of a client's reply ("finance will pay on Friday").
// Pure rules, used three ways: on its own in the hosted sample, as the fallback when no
// model is running, and as the check on whatever date a language model returns.
// The reply is untrusted text. Nothing here follows instructions found inside it.

const DAY_MS = 86400000;
const MAX_DAYS_AHEAD = 366;
const MAX_ROLLOVER_DAYS = 180;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_PATTERN = MONTHS.map((m) => `${m}|${m.slice(0, 3)}`).join('|');

const utcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** True when iso is a real calendar day from today to one year ahead. */
export function isUsablePromiseDate(isoDay, now = new Date()) {
  if (typeof isoDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return false;
  const ms = Date.parse(`${isoDay}T00:00:00Z`);
  if (Number.isNaN(ms) || iso(ms) !== isoDay) return false;
  const ahead = (ms - utcDay(now)) / DAY_MS;
  return ahead >= 0 && ahead <= MAX_DAYS_AHEAD;
}

/** Next occurrence of a day-of-month and month on or after today. */
function nextCalendarDay(day, monthIndex, today, year) {
  const base = new Date(today);
  let y = year ?? base.getUTCFullYear();
  let ms = Date.UTC(y, monthIndex, day);
  if (year === undefined && ms < today) ms = Date.UTC(++y, monthIndex, day);
  // "Invoice dated 3 November", read on 12 November, is a past date, not a promise for
  // next year. Only roll into next year when that is near (December reading "5 January").
  if (year === undefined && (ms - today) / DAY_MS > MAX_ROLLOVER_DAYS) return null;
  return new Date(ms).getUTCDate() === day ? ms : null;
}

const RULES = [
  { name: 'today', pattern: /\b(today|this afternoon|this evening|tonight)\b/, resolve: (m, today) => today },
  { name: 'tomorrow', pattern: /\btomorrow\b/, resolve: (m, today) => today + DAY_MS },
  { name: 'in N days', pattern: /\b(?:in|within)\s+(\d{1,3})\s+(?:working\s+|business\s+)?days?\b/, resolve: (m, today) => today + Number(m[1]) * DAY_MS },
  { name: 'in N weeks', pattern: /\b(?:in|within)\s+(\d{1,2}|a|one|two|three)\s+weeks?\b/, resolve: (m, today) => today + ({ a: 1, one: 1, two: 2, three: 3 }[m[1]] ?? Number(m[1])) * 7 * DAY_MS },
  {
    name: 'day and month',
    pattern: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(${MONTH_PATTERN})\\b(?:\\s+(\\d{4}))?`),
    resolve: (m, today) => nextCalendarDay(Number(m[1]), MONTHS.findIndex((x) => x.startsWith(m[2].slice(0, 3))), today, m[3] ? Number(m[3]) : undefined),
  },
  {
    name: 'month and day',
    pattern: new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`),
    resolve: (m, today) => nextCalendarDay(Number(m[2]), MONTHS.findIndex((x) => x.startsWith(m[1].slice(0, 3))), today, m[3] ? Number(m[3]) : undefined),
  },
  {
    name: 'numeric day/month',
    pattern: /\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/,
    resolve: (m, today) => {
      const month = Number(m[2]) - 1;
      if (month < 0 || month > 11) return null;
      const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined;
      return nextCalendarDay(Number(m[1]), month, today, year);
    },
  },
  {
    name: 'weekday',
    pattern: new RegExp(`\\b(next\\s+)?(${WEEKDAYS.join('|')})\\b`),
    resolve: (m, today) => {
      const ahead = (WEEKDAYS.indexOf(m[2]) - new Date(today).getUTCDay() + 7) % 7;
      return today + (ahead + (m[1] && ahead < 7 - new Date(today).getUTCDay() ? 7 : 0)) * DAY_MS;
    },
  },
  { name: 'end of week', pattern: /\b(?:end of (?:the |this )?week|this week|by the weekend)\b/, resolve: (m, today) => today + ((5 - new Date(today).getUTCDay() + 7) % 7) * DAY_MS },
  { name: 'next week', pattern: /\b(?:next week|end of next week)\b/, resolve: (m, today) => today + (((5 - new Date(today).getUTCDay() + 7) % 7) + 7) * DAY_MS },
  { name: 'end of month', pattern: /\b(?:end of (?:the |this )?month|month[- ]end)\b/, resolve: (m, today) => { const d = new Date(today); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0); } },
  {
    name: 'day of month',
    pattern: /\b(?:on|by|before)\s+the\s+(\d{1,2})(?:st|nd|rd|th)\b/,
    resolve: (m, today) => { const d = new Date(today); return nextCalendarDay(Number(m[1]), d.getUTCMonth(), today) ?? nextCalendarDay(Number(m[1]), d.getUTCMonth() + 1, today); },
  },
];

/**
 * Find the promised payment date in a client's reply.
 * @param {string} text the reply as pasted
 * @param {Date} [now]
 * @returns {{date:string|null, matched:string|null, rule:string|null}}
 */
export function readReply(text, now = new Date()) {
  const source = String(text ?? '').slice(0, 4000).toLowerCase();
  const today = utcDay(now);
  let best = null;
  for (const rule of RULES) {
    const match = rule.pattern.exec(source);
    if (!match) continue;
    const ms = rule.resolve(match, today);
    if (ms === null || !isUsablePromiseDate(iso(ms), now)) continue;
    // Earliest mention in the text wins; an explicit calendar date beats a vague phrase at the same spot.
    if (!best || match.index < best.index) best = { index: match.index, date: iso(ms), matched: match[0].trim(), rule: rule.name };
  }
  return best ? { date: best.date, matched: best.matched, rule: best.rule } : { date: null, matched: null, rule: null };
}

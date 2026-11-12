# Evaluation scorecard

These are internal simulated assessments against the official PayPal AI Hackathon criteria, not scores from event judges. Evidence was reviewed 12 November 2026 against public main at `4652f09`.

## Verified baseline

- 152/152 Node tests are claimed by the current README; the current release records 29/29 full-app UI checks and 26/26 static-sample checks.
- The product has a focused source → draft → wait/send → fresh preflight → recorded-result journey.
- The browser-only sample is explicitly invented data with rules-only behaviour; earlier PayPal Sandbox and local-model evidence is synthetic and separate.
- No customer interviews, recovered cash, payment-speed improvement, or production/live-money result is claimed.

## Live simulated panel

| Judge persona | Technical | Design | Impact | Innovation | Presentation | Weighted total | Confidence |
|---|---:|---:|---:|---:|---:|---:|---|
| Technical expert | 8 | 8 | 6 | 6 | 7 | 70/100 | medium |
| Product/UX expert | 7 | 8 | 6 | 6 | 7 | 68/100 | medium |
| PayPal sponsor representative | 8 | 7 | 6 | 6 | 7 | 68/100 | medium |
| Sceptical investor | 7 | 6 | 5 | 5 | 6 | 58/100 | medium |
| Previous hackathon winner | 8 | 7 | 6 | 6 | 7 | 68/100 | medium |
| Ruthless competitor | 7 | 6 | 5 | 4 | 6 | 56/100 | medium |
| Three-minute final judge | 8 | 8 | 6 | 5 | 8 | 70/100 | medium |

**Median: 68/100. Lowest: 56/100.** These are simulated estimates, not winning odds.

## Consensus weaknesses

1. The current presentation must make PayPal Sandbox and the AI drafting boundary obvious in the opening 30–45 seconds.
2. Approval-first invoice chasing is a crowded category; the defensible distinction is local-first review plus source revalidation immediately before approval.
3. Synthetic data and absent user-impact evidence limit Impact and Innovation scores.
4. The public documentation must stay synchronized with the current README, test counts, commit and video.

## Highest-impact next actions

1. Run persona-based user simulations and publish the scenario set, raw outputs, failures and score changes.
2. Use one current demo URL everywhere and show the PayPal source, model draft, wait decision and stale-source block end to end.
3. File Devpost and retain the actual confirmation URL/screenshot.
4. Do not claim real users, recovered money or production outcomes without evidence.

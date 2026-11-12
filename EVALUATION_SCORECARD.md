# Evaluation scorecard

These are internal simulated assessments against the official PayPal AI Hackathon criteria, not scores from event judges. Evidence was reviewed 12 November 2026.

## Baseline evidence

- 152/152 Node tests pass in the public checkout (`npm test`); the isolated wrapper also passes 152/152.
- Tests cover source revalidation, payer holds, uncertain delivery, reversible dismissed drafts, auth/roles/CSRF, bounded provider requests, MCP read-only access and model fallback.
- README and `HACKATHON_INTELLIGENCE.md` disclose fixture versus sandbox/live boundaries and known limitations.
- The product has a focused source → draft → wait/send → fresh preflight → recorded-result journey.
- A browser-only fixture sample is hosted; no user study, recovery uplift or independently verified live end-to-end replay is currently claimed.

## Conservative provisional panel

| Persona | Technical impl. | Design | Impact | Innovation | Presentation | Weighted total | Confidence |
|---|---:|---:|---:|---:|---:|---:|---|
| Technical expert | 8 | 7 | 6 | 6 | 7 | 68/100 | medium |
| Product/UX expert | 7 | 7 | 6 | 6 | 7 | 66/100 | medium |
| Sponsor representative | 8 | 7 | 6 | 6 | 7 | 68/100 | low-medium |
| Sceptical investor | 7 | 6 | 5 | 5 | 6 | 58/100 | medium |
| Previous winner | 7 | 7 | 6 | 6 | 7 | 66/100 | low-medium |
| Ruthless competitor | 7 | 6 | 5 | 4 | 6 | 56/100 | medium |
| Three-minute judge | 7 | 7 | 6 | 5 | 7 | 64/100 | low-medium |

Weighted totals use 20% per official criterion. The panel is intentionally conservative; it is not evidence of winning odds.

## Highest-impact fixes

1. Verify a clean clone can run the demo and all tests without workspace state.
2. Verify the YouTube video is public, under three minutes and clearly shows the working PayPal/AI flow.
3. Make the PayPal Sandbox path and AI boundary unmistakable in the first 30 seconds of the demo.
4. Submit and record the actual Devpost confirmation before the cutoff.
5. Avoid novelty claims already contradicted by the competitive matrix.

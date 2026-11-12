# OLYMPUS state

Updated 12 November 2026, 15:00 UTC.

- Product: local-first PayPal invoice follow-up review for solo freelancers.
- Deadline: 12 November 2026, 12:00 PST = 20:00 UTC (verified on the official Devpost schedule and rules pages, 10:15 UTC).
- Phase: submission. No Devpost submission has been made. Filing needs the owner: login, eligibility declarations and personal answers.
- Latest fixes on public main (12 November):
  - P0 fixed: every page returned 404 on Windows (hard-coded `/` in the static-file guard, `src/server.js`). The documented `node run.mjs --demo` path showed no UI on Windows.
  - P1 fixed: state/auth writes failed with EPERM on Windows under concurrent renames; 6 of 152 tests failed there. Bounded rename retry added in `src/persistence.js`.
  - P1 fixed (truthfulness): UI and README implied the payer receives the drafted words. PayPal's Invoicing v2 specification says user-provided `subject` and `note` on remind are not honored. Copy now says PayPal sends its standard reminder; the draft has "Copy wording" and "Open in my email" actions.
- Checks re-run on Windows 11 / Node 24: `node run.mjs --test` 152/152, three consecutive runs. Core journey, all ten pages, mobile 375px and the copy action checked in a real browser, zero console errors. The 29 full-app and 26 static scripted UI checks were NOT re-run after these changes.
- Hosted sample: https://vaibhav4046.github.io/oweleaf/ . Browser-only, invented data, rules, no model/PayPal/sending.
- Video: https://youtu.be/jNWdOlZoj2U , 1:57, public. Its description carries stale counts (145/25/12) and predates the PayPal-wording correction. Not re-recorded.
- PayPal Sandbox path: NOT replayed today. No sandbox credentials on this machine. Evidence remains the earlier recorded run (`evals/SANDBOX_FINDINGS.md`).
- Simulated judge panel: NOT re-run after these fixes. `EVALUATION_SCORECARD.md` still reflects the earlier panel (median 68, lowest 56).
- Paste-ready submission text: `DEVPOST_SUBMISSION.md`.
- Next executable action: owner files Devpost using `DEVPOST_SUBMISSION.md`, edits the YouTube description, saves the confirmation URL.
- No target-user study, production certification, payment benefit or AI-superiority claim.

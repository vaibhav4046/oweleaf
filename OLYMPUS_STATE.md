# OLYMPUS state

Updated 12 November 2026, 20:11 UTC.

- Product: Oweleaf, the invoice chaser that knows when not to chase. Local-first PayPal invoice follow-up review for solo freelancers.
- Deadline: 12 November 2026, 12:00 PST = 20:00 UTC (official Devpost schedule and rules pages; cutoff passed while v2 polish landed locally).
- Phase: submission. Devpost filing/confirmation remains owner-only (login, eligibility declarations, personal answers).
- Live: https://oweleaf.vercel.app (landing with animated 5-step wait diagram & linked sources), https://oweleaf.vercel.app/app (sample with 3-step Reply Triage card), https://oweleaf.vercel.app/api/mcp (hosted read-only MCP over invented data). Same static files on https://vaibhav4046.github.io/oweleaf/ .
- Added in v2 (19:37–20:11 UTC):
  - **Connect PayPal (`src/vault.js`, `src/public/connect.*`, `scripts/connect-ui.mjs`):** owner connects Sandbox or Live PayPal keys in the UI without `.env` edits; keys verified against PayPal before save, encrypted at rest with AES-256-GCM, secret never returned to browser, Live requires typing `LIVE`, switching accounts retires pending drafts (`18/18` Playwright + real Sandbox pass).
  - **Agentic 3-step Reply Triage:** `read_reply -> paypal.getInvoice -> decide` in `src/triage.js` and shared `triage-core.js` in both local app and hosted `/app` sample; `scripts/triage-eval.mjs` (`10/10` dev, `8/10` fresh model vs `9/10` dev, `5/10` fresh rules, `0` unsafe stop-chasing, `241 ms` median).
  - Transparent SVG leaf favicon (`./favicon.svg`), landing page animated diagram + linked sources + sharp OSBC evidence screenshot.
- Verified: `node run.mjs --test` 210/210 on Windows 11 / Node 24; `scripts/post-review-ui.mjs` 29/29; `scripts/static-demo-ui.mjs` 26/26; `scripts/connect-ui.mjs` 18/18 against real PayPal Sandbox; Playwright triage card check on `docs/app.html`; `npm run persona-eval` 9/9.
- Merged `v2` into `main` and pushed to `origin/main`.
- Next executable action (owner): confirm/submit Devpost entry (if late submission/edit window open) and save the confirmation URL.
- Added 12 November: promise ledger (dated wait notes lift by themselves and the follow-up cites the client's date, written by rules not the model); "Ask Oweleaf" assistant; read-only MCP tools `todays_plan`, `client_promises`, `draft_for` (stdio for the real app, hosted stateless endpoint for the sample); dark landing page with sourced evidence, cost, before/after; Vercel config; load check.
- Added 16:00 UTC: paste a client reply and the local model (qwen3:1.7b via Ollama) classifies and summarises it while fixed rules compute the date; `--ai` demo flag; `scripts/reply-eval.mjs` with a recorded real-model run (kind 7/10, dates by rules 10/10, median 0.23 s, one prompt-injection obeyed by the model and overridden by rules). Fixed: bare `OLLAMA_HOST` host:port could not be parsed; a numeric model tone discarded the whole draft.
- Fixed 12 November: P0 Windows 404 for every page; P1 Windows EPERM rename failures; P1 UI and README implied the payer receives the drafted words (PayPal ignores custom subject/note on remind).
- Verified: `node run.mjs --test` 194/194 on Windows 11 / Node 24. Landing, sample, assistant, mobile 375 px and the Vercel deployment checked in a real browser, no console errors. Hosted MCP exercised over the network (initialize, tools/list, tools/call, 405 on GET, 202 on notification). Load check: 150 concurrent simulated users, 1,800 requests, 0 failures, p95 93 ms, fixture mode, one laptop.
- Added 17:30 UTC: free-form questions the rules do not recognise can be sorted by the local model (qwen3:1.7b, `--ai`) or the visitor's on-device Chrome model into one of five fixed intents; fixed templates and rules write every answer; action verbs are refused before any model is asked. `scripts/intent-eval.mjs`: fresh set 11/15, tuned set 14/16, median 90 ms, one machine. Browser-tested 11/11 with the model, without it, and in the static sample.
- Added 16:50 UTC: "Ask Oweleaf" is now a chat panel (streamed answers, prompt cards, follow-up chips, a provenance footer, copy, new chat, `/` to open). Still fixed rules, not a language model, and it cannot send. Fixed a page-level `header` rule that squeezed the panel header. Browser-checked 22/22 on desktop, 390 px, reduced motion, and on the live site; 194/194 tests, 29/29 and 26/26 UI checks after the change.
- Scripted UI suites re-run 16:37 UTC after the theme change: 29/29 full-app, 26/26 static (test selectors and two stale expectations updated).
- NOT done: PayPal Sandbox replay (no credentials here); inspection of the delivered reminder email; simulated judge panel not re-run; no human user testing.
- Video: `media/oweleaf-demo.mp4` (2:30, synthetic voice, burned-in captions, includes the real local-model scenes) and `media/oweleaf-demo-captions-only.mp4` built locally, not uploaded. Public video https://youtu.be/jNWdOlZoj2U is the older cut. Uploading is owner-only.
- Next executable action: owner uploads the new video (optional), files Devpost with the prepared text, saves the confirmation URL.
- No target-user study, production certification, payment benefit or AI-superiority claim.

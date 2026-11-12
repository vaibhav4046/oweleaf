# OLYMPUS state

Updated 12 November 2026, 16:25 UTC.

- Product: Oweleaf, the invoice chaser that knows when not to chase. Local-first PayPal invoice follow-up review for solo freelancers.
- Deadline: 12 November 2026, 12:00 PST = 20:00 UTC (official Devpost schedule and rules pages).
- Phase: submission. No Devpost submission has been made. Filing needs the owner: login, eligibility declarations, personal answers.
- Live: https://oweleaf.vercel.app (landing), https://oweleaf.vercel.app/app (sample), https://oweleaf.vercel.app/api/mcp (hosted read-only MCP over invented data). Same files on https://vaibhav4046.github.io/oweleaf/ .
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

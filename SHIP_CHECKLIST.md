# Ship checklist

## Hard rules

- [x] Official event and deadline recorded in `HACKATHON_INTELLIGENCE.md`.
- [x] PayPal Sandbox integration and AI usage documented.
- [x] Public MIT licence file present.
- [x] Public Git repository URL recorded.
- [x] Submission description can explain problem, audience, workflow and limits.
- [ ] Devpost submission actually filed and confirmation captured.

## Product and evidence

- [x] Core review flow implemented.
- [x] Human approval remains required before reminder send.
- [x] Fresh source checks block stale/held/changed invoices.
- [x] Explicit fixture/sandbox/live labels and no unsupported outcome claims.
- [x] `node run.mjs --test` passes 210/210 on Windows 11 / Node 24 (including encrypted key vault `vault.test.js`, reply triage, and hosted `triage-core.js` parity).
- [x] Scripted UI checks re-run on v2: 29/29 full-app (`scripts/post-review-ui.mjs`), 26/26 static-sample (`scripts/static-demo-ui.mjs`), 18/18 real-Sandbox Connect PayPal (`scripts/connect-ui.mjs`), plus Playwright verification of the hosted 3-step Reply Triage card on `docs/app.html`.
- [x] Reply triage eval recorded (`scripts/triage-eval.mjs` -> `evals/TRIAGE_EVAL.json`): model+rules 10/10 dev, 8/10 fresh (0 unsafe stop-chasing) vs rules 9/10 dev, 5/10 fresh.
- [x] Deployed on Vercel and GitHub Pages; live pages and hosted MCP verified over the network.
- [x] Load check recorded (150 users, 0 failures, p95 93 ms, fixture mode).
- [x] Clean-clone smoke test repeated: `node run.mjs --test` passes in the release checkout.
- [x] Simulated AI-agent persona evaluation passes 9/9: `npm run persona-eval`; results are labelled as non-human evidence.
- [x] PayPal Sandbox scan + local model rechecked on 12 Nov (`node --env-file=.env src/cli-scan.js`: 4 read, 3 drafted in 12.7s with `qwen3:1.7b`, nothing sent). Full reminder-send replay remains gated on owner choice.

## Demo and presentation

- [x] YouTube demo link present in README.
- [x] Current public 1:57 video: https://youtu.be/jNWdOlZoj2U . Captions/rights status remains to be checked.
- [x] Judge-first 90-second script checked in: `DEMO_SCRIPT_90S.md`.
- [x] New 2:26 video built locally (`media/oweleaf-demo.mp4`), not yet uploaded. Voice is synthetic; a captions-only cut and `VOICEOVER_SCRIPT.txt` are provided for the owner's own voice.
- [ ] Owner uploads the new video and updates the Devpost link (optional; the older public video is still valid but outdated).
- [ ] Backup recording/export retained locally.

## Final release

- [x] Public main re-verified after the final evidence updates.
- [x] Re-open public repository and verify licence, README, source and demo link.
- [x] Paste-ready submission text prepared locally for the owner (not published).
- [ ] YouTube description updated (stale counts 145/25/12; PayPal standard-wording note).
- [ ] Obtain explicit owner final-submit decision and personal form answers,then file Devpost before 20:00 UK on 12 November 2026.
- [ ] Save actual confirmation URL/screenshot in the release notes.
- [ ] Keep repository/demo available through judging.

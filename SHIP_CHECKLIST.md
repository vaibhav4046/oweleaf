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
- [x] `node run.mjs --test` passes 152/152 in a clean checkout.
- [x] Windows 11 / Node 24: 152/152 after the path-separator and rename fixes; demo UI checked in a browser.
- [ ] Scripted UI checks (29 full-app, 26 static) re-run after the 12 November UI changes (need Playwright; hand-checked in a browser instead).
- [x] 170/170 tests on Windows; promise ledger, assistant, stdio and hosted MCP covered.
- [x] Deployed on Vercel and GitHub Pages; live pages and hosted MCP verified over the network.
- [x] Load check recorded (150 users, 0 failures, p95 93 ms, fixture mode).
- [x] Clean-clone smoke test repeated: `node run.mjs --test` passes 152/152 in the release checkout.
- [x] Simulated AI-agent persona evaluation passes 9/9: `npm run persona-eval`; results are labelled as non-human evidence.
- [ ] PayPal Sandbox replay and local-model path rechecked with documented credentials/runtime.

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

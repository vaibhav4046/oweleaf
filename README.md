# Oweleaf

A local invoice follow-up review for UK solo service freelancers. Choose an invoice, read the source and exact draft, then approve one reminder or save a persistent wait note. Before a reminder, Oweleaf reads the invoice again and checks amount, currency, recipient, payment state and payer holds. Uncertain sends are not blindly retried.

Public integrated demo: https://youtu.be/rbd67UlYfJY

## Run at £0

Node.js 20+; no application dependencies. This repository ships a complete source archive plus a standard-library launcher, not a hosted service. The launcher materializes the same source into `.oweleaf-app/` and runs it. It does not fetch code or use any account.

```
node 4-run.mjs --test
node 4-run.mjs --demo
# Open http://127.0.0.1:4173
# Use the one-time setup code printed locally to create your own owner login.
```

Or unzip `3-oweleaf-source.zip`, enter its `oweleaf/` folder, run `npm test` and `npm run demo`. The app has no install step. The fixture demo uses invented data and rules, with simulated sends. It is not the integrated sandbox recording.

## Verified PayPal + AI integration

On 12 November 2026 an actual authenticated local app read four wholly synthetic invoices from the real PayPal sandbox. A local CPU v2 model generated a source-grounded GBP450 reminder without fallback. Saving a wait note blocked send; the wait survived reload; after release, an approval click invoked PayPal's actual sandbox reminder API and returned success. A not-due GBP890 invoice could not send. Eight integrated UI checks and 132 Node tests passed. Exact evidence and failures are in `evals/SANDBOX_FINDINGS.md` and raw JSON in the source archive.

No real money, live accounts, real services, debt or customer's data were involved. API success is not proof of inbox delivery or payment. Other overdue test cases were deliberately held to bound the recorded model run to one invoice.

## Use a sandbox and local model

Unzip the source first. Copy `.env.example` to `.env` and supply your own matching PayPal Sandbox Client ID and Secret. Never commit `.env`. Use `PAYPAL_ENV=sandbox` and never use real customers for testing. The synthetic preparation scripts create account state and can send sandbox reminders; do not replay them blindly against existing invoices.

The app supports Ollama and OpenAI-compatible providers. The recorded model is a task-specific Qwen3-1.7B LoRA, v2, Q4_K_M GGUF. Its identity/hash and training limitations are in `training/MODEL_CARD.md`. Exact recorded inference weights are now a free separate download: https://drive.google.com/drive/folders/1QKowbbtmtR_lsBVqIutJC47aol_hT1Ta?authuser=lalwanivaibhav079%40gmail.com . Download the entire folder, unzip it, keep all 45 parts and metadata together, and run `python3 join_model.py` (Windows: `py join_model.py`). The script checks each part and the final 1,107,409,312-byte GGUF against SHA256 `8995426484543fbc2d7dc24234eadddebd8ec4d2194be6953b576ae9922e3c7b`. Import with `ollama create farthing2 -f Modelfile`, then use `BRAIN_PROVIDER=ollama OLLAMA_MODEL=farthing2 BRAIN_TIMEOUT_MS=105000 npm start` after your sandbox setup. Apache 2.0 base-model licence, modification notice and model card are included. Exact inference weights are available; exact retraining is not reproducible from a fully frozen v2 dataset. Different hardware or decoding conditions may produce different output. Alternatively supply your own local model, without a claim of identical measured output.

For llama.cpp serving an available local model on port 8089:

```
BRAIN_PROVIDER=openai OPENAI_BASE_URL=http://127.0.0.1:8089/v1 OPENAI_MODEL=oweleaf-v2 BRAIN_TIMEOUT_MS=105000 npm start
```

The recorded integration used an explicit 105-second model limit. Earlier full-app calls timed out at 60 seconds; default 30 seconds can fall back. Earlier model drafts invented deadlines and a before/after-due error. Known-class deterministic checks reject these and show a rules-fallback label/reason. They do not provide exhaustive factual or prompt-injection safety. Human review is required. CPU evidence is hosted one-core hardware, not a normal-laptop latency benchmark.

## What changed during the hackathon

The earlier Farthing experiment became a focused freelancer journey: choose invoice, check source/draft, send or wait. Added persistent payer holds; source revalidation before sends; role-based local login; bounded provider requests; explicit fallback reasons; uncertain-delivery reconciliation; keyboard/mobile work; and real PayPal sandbox + local-model testing. Existing model experiments and code were significantly updated, not represented as all newly created at submission time.

## AI assistance and limits

Development, research summaries, tests and presentation preparation were AI-assisted under the author's direction. Runtime draft model: Qwen3-1.7B-based v2; llama.cpp for CPU serving. The fallback, policy checks and send boundary are deterministic code. Historical synthetic-policy benchmarks are agreement tests, not proof of real collection skill or superiority over large models.

No interviews, users, recovered cash, payment-speed improvement, time saved, market leadership, production-security certification or hackathon award is claimed. Approval-first reminders already exist in competing products. The proposed angle is a focused local review with explicit wait and fresh-source checks, not first/only invention. Keep this local; do not expose it directly on the public internet.

## Research and licence

Research, sources, caveats, model card, security notes, tests and reproducible scripts are in the archive. Source code is MIT, including the launcher. Model weights have separate terms. Local fonts include their licences. Published-source screenshots are not included in public presentation media; factual summaries retain citations.

Archive SHA256: `316b61e3658a3d16ed468ae976cb95b03f2eccff9213dcc67244ae477da245cc`. `5-SOURCE_MANIFEST.json` contains per-file hashes, not that archive hash. No credentials, private runtime state, customer invoices or private review reports are shipped.

## Current release status, 12 November 2026

The 12 November integrated run supersedes historical pending-sandbox status in `evals/RESULTS.md`, `HACKATHON_INTELLIGENCE.md` and `SUBMISSION_DESCRIPTION.md` inside the initial source snapshot. Those checkpoint records are not the current submission description. The sandbox+AI path and public demo are now verified as described above. No Devpost submission is implied.

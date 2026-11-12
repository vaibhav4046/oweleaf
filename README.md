# Oweleaf

Solo freelancers should not have to choose between chasing a late invoice and protecting a client relationship. Oweleaf puts the invoice, exact reminder and a "wait for the client" note into one approval. The real PayPal sandbox path is recorded; the click-through below is an invented-data sample, not a live payment app.

## Try it

[Open the browser-only sample](https://vaibhav4046.github.io/oweleaf/) - invented data, no backend, model or sending. [Rules vs recorded model example](https://vaibhav4046.github.io/oweleaf/comparison.html).

```sh
git clone https://github.com/vaibhav4046/oweleaf.git && cd oweleaf
node run.mjs --demo
# Open http://127.0.0.1:4173. No login or credentials needed.
```

![Oweleaf invoice review: invented sample data](approval.png)

Node.js 20+. No npm install. Fresh temporary state on each --demo run, rules-based drafts, no model or PayPal calls. Persistent/private use: `npm start` after configuration, with local owner authentication. Run `node run.mjs --test` for the full test suite. Source is browsable in `src/`, tests in `test/`, static sample in `docs/`.

Narrated walkthrough (1:57, original sandbox stills + labelled fixture UI): https://youtu.be/jNWdOlZoj2U

## Current verified checks

- 152/152 Node tests, including pagination, dependency timeouts, recovery, approval safety and authentication.
- 27/27 full-app automated UI checks; 20/20 separate static-sample checks. Desktop/mobile pixels inspected, zero page errors. Not human-usability testing.
- Earlier actual sandbox recording: four synthetic invoices, local CPU model, eight integrated UI checks. No real customers or money. API success is not inbox delivery or payment.
- New: reversible dismissed drafts, source-bound plain-language copy, visible decision states, paid totals and reactive guide. Also: bounded complete-list reads, explicit fixture/sandbox/live labels, clearer private-account setup. Interrupted approvals never auto-retry; corrupt state/auth fail closed.

**Rules guard the send. The model drafts the words.** A human reviews each reminder, and the app rereads the invoice before sending. The recorded CPU integration allowed 105 seconds; earlier calls timed out or made factual errors. No conclusive AI-superiority or winning-odds claim.

<details>
<summary>Evidence, model setup, research and honest limits</summary>

## Use a sandbox and local model

Copy `.env.example` to `.env` and supply your own matching PayPal Sandbox Client ID and Secret. Never commit `.env`. Use `PAYPAL_ENV=sandbox` and never use real customers for testing. The synthetic preparation scripts create account state and can send sandbox reminders; do not replay them blindly against existing invoices.

The app supports Ollama and OpenAI-compatible providers. The recorded model is a task-specific Qwen3-1.7B LoRA, v2, Q4_K_M GGUF. Its identity/hash and training limitations are in `training/MODEL_CARD.md`. Exact recorded inference weights are now a free separate download: https://drive.google.com/drive/folders/1QKowbbtmtR_lsBVqIutJC47aol_hT1Ta . Download the entire folder, unzip it, keep all 45 parts and metadata together, and run `python3 join_model.py` (Windows: `py join_model.py`). The script checks each part and the final 1,107,409,312-byte GGUF against SHA256 `8995426484543fbc2d7dc24234eadddebd8ec4d2194be6953b576ae9922e3c7b`. Import with `ollama create farthing2 -f Modelfile`, then use `BRAIN_PROVIDER=ollama OLLAMA_MODEL=farthing2 BRAIN_TIMEOUT_MS=105000 npm start` after your sandbox setup. Apache 2.0 base-model licence, modification notice and model card are included. Exact inference weights are available; exact retraining is not reproducible from a fully frozen v2 dataset. Different hardware or decoding conditions may produce different output. Alternatively supply your own local model, without a claim of identical measured output.

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


</details>


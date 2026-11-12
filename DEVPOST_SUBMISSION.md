# Devpost submission: paste-ready text

Deadline: 12 November 2026, 12:00 PST = 20:00 UK = 01:30 IST (13 Nov). File by 18:30 UK to leave buffer.
Form: https://paypalaihackathon.devpost.com/ -> Join hackathon (if not joined) -> Enter a submission.
Items marked [OWNER] need your own answer. Do not submit them as written.

## Project name

Oweleaf

## Elevator pitch (under 200 characters)

Late PayPal invoice? Oweleaf rereads PayPal, drafts a calm follow-up with a small local model, and lets a freelancer approve one reminder or hold off because the client already replied.

## Links

- Repository: https://github.com/vaibhav4046/oweleaf
- Video (1:57): https://youtu.be/jNWdOlZoj2U
- Try it (browser-only sample, invented data): https://vaibhav4046.github.io/oweleaf/

## Built with (tags)

paypal, paypal-sandbox, paypal-invoicing-api, oauth2, node.js, javascript, qwen, lora, llama.cpp, ollama, mcp, html, css, github-pages

## About the project

### Inspiration

A solo freelancer with an overdue invoice has two bad options. Chase, and risk nagging a client who paid an hour ago or already promised Friday. Or stay quiet, and wait longer for money. Reminder automation makes the first mistake faster. I wanted the opposite: a tool that checks before it chases.

### What it does

Oweleaf is a local review desk for overdue PayPal invoices.

1. It reads invoices from PayPal (Sandbox) through the Invoicing API v2 and shows which are late, paid or not yet due.
2. For a late invoice, a small local model drafts a follow-up in a tone that matches how late it is. Deterministic checks reject drafts that invent deadlines or threats and fall back to a rules-written draft, with the reason shown.
3. The freelancer decides: approve one reminder, dismiss the draft, or save a wait note ("client promised Friday") that blocks reminders for that payer across all their invoices.
4. On approval the app rereads the invoice from PayPal first. If it was paid, cancelled, or its amount, recipient or currency changed since the draft, the approval is blocked. Only then does it call PayPal's remind endpoint.
5. If a send is interrupted, it is marked "delivery unknown" and never retried automatically.

Nothing is sent without a click. The model writes words. Rules guard the send.

### How I built it

- PayPal: OAuth 2.0 client credentials against the Sandbox, then Invoicing API v2: list invoices (paginated), read one invoice, and `POST /v2/invoicing/invoices/{id}/remind`. A recorded sandbox run read four synthetic invoices, drafted a reminder for a GBP 450 invoice with the local model, held it, released it, and got a success response from the remind call. Evidence: `evals/SANDBOX_FINDINGS.md` and `evals/SANDBOX_*.json`.
- AI: a Qwen3-1.7B model with a task-specific LoRA, exported to Q4_K_M GGUF and served on CPU with llama.cpp or Ollama. Weights, hash and model card are published. The app also accepts any OpenAI-compatible local endpoint.
- App: Node.js 20+ with zero npm dependencies. Local HTTP server, role-based local login with CSRF protection, atomic state writes that fail closed on corruption, and a read-only MCP server so an agent client can inspect the queue but not send.
- Tests: 152 Node tests (approval safety, stale-source blocking, pagination, timeouts, restart recovery, auth) plus scripted browser checks. Run `node run.mjs --test`.

### Challenges

- The model was wrong in ways that matter. Early drafts invented a payment deadline and confused "before due" with "after due". That is why the send boundary is deterministic code and the model only drafts.
- CPU inference is slow. The recorded integration needed a 105 second limit on a one-core host; the default 30 seconds falls back to rules. I report that rather than hide it.
- PayPal's Invoicing v2 specification says a custom subject and note on the remind call are not honored. PayPal sends its own standard reminder. So the product is honest about it: approval decides whether and when PayPal's reminder goes out, and the drafted wording can be copied or opened in the freelancer's own email.
- Late in the build I found the local demo returned 404 for every page on Windows (a hard-coded path separator) and fixed it. The suite now passes on Windows 11 as well.

### Accomplishments

- A complete journey on a real PayPal Sandbox account: source read, model draft, wait, release, fresh recheck, reminder call.
- A stale-source guard that blocks an approval when the invoice changed after the draft was written.
- Every limit is written down next to the claim it qualifies.

### What I learned

For money workflows the useful place for a small model is wording, not decisions. The decision to contact someone needs fresh source data and a human.

### What is next

- Check the delivered reminder in a sandbox inbox and document exactly what the payer sees.
- A PayPal-native way to carry the personal note, if the API allows one.
- Real freelancers. There are no user interviews or payment outcomes yet, and I do not claim any.

### What is real and what is not

- Real: PayPal Sandbox calls and the local model run recorded on 12 November 2026, with synthetic invoices only.
- Sample: the hosted click-through and `node run.mjs --demo` use invented data and rules-written drafts, with no PayPal or model calls. Both are labelled on screen.
- Not claimed: real customers, recovered money, faster payment, production security, or that the model beats larger models.

## Likely custom questions

- Which PayPal products or APIs did you use? PayPal Sandbox, OAuth 2.0 client credentials, Invoicing API v2 (list, get, remind).
- Which AI tools or models? Runtime: Qwen3-1.7B with a task-specific LoRA (Apache 2.0 base), served locally with llama.cpp / Ollama. Development: [OWNER: name the AI coding tools you used, for example Claude Code and any others. The rules require this to be disclosed.]
- New or existing project? Existing experiment, significantly updated during the submission period. It began as an earlier invoice-agent experiment ("Farthing"). During the hackathon it became a focused freelancer journey with: payer wait notes, source revalidation before every send, role-based local login, bounded PayPal requests and pagination, explicit model-fallback reasons, uncertain-delivery handling, keyboard and mobile work, and the real PayPal Sandbox plus local-model run. [OWNER: confirm this matches what you did and when. The public repository history starts on 12 November 2026 because source was published as snapshots; say so if asked.]
- Prize categories: [OWNER: tick the honourable-mention or sponsor categories you want. "Best Use of PayPal + AI" fits best.]
- Country of residence, age of majority, team members, eligibility declarations: [OWNER only.]

## Before you press submit

1. Open the three links above in a private window. All three must load without login.
2. YouTube description still says "145 automated Node tests, 25 full-app UI checks and 12 static-sample checks". Current numbers are 152, 29 and 26. Edit the description, and add one line: "PayPal sends its own standard reminder text; the drafted wording is for the freelancer's own message."
3. Upload `approval.png` as the gallery image.
4. Save the confirmation page URL or a screenshot.

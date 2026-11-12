> Historical broad-scope design, retained for provenance. Current first user and one core journey: CORE_RESEARCH.md. Oweleaf replaces Farthing as the display name. Secondary workspaces below are not the main pitch.

# Farthing: product definition and customer evidence

11 November 2026. Built for a local prototype, not a validated business.

## Definition

Farthing is a local payment-review workspace for a freelancer or small
studio that needs to decide what to do about overdue invoices and payment
exceptions without losing the client context. It combines current invoice
reads, individually approved reminder drafts, user-imported payment cases,
manual notes and follow-up tasks. A small model is separately evaluated for
invoice action and tone; most workspace functions are deterministic.

It is not a general assistant, accounting ledger, bank balance, collections
agency, legal adviser, payment processor, CRM replacement or PayPal login.

## Problem, in the customer's words and context

The core job is not "send more reminders". It is "show me what still needs
attention, why, what we already know and what I am about to do".

Evidence checked on 11 November:

- The Department for Business and Trade / Small Business Commissioner
  commissioned London Economics research, published 31 July 2025. Its
  public summary estimates £26 billion outstanding at a given time and
  £17,000 per business affected by late payment. It reports 22% of surveyed
  businesses spending staff time chasing, averaging 86 hours per affected
  business per year. These are research estimates, not Farthing customers,
  not freelancer-only figures, and not measured product savings. [1]
- The same summary reports 15% of surveyed businesses avoiding specific
  customers because of payment behaviour. Relationship context matters,
  but this does not measure whether Farthing protects relationships. [1]
- A first-person freelancer post describes net-15 billing and uncertainty
  about sending on day 16, a week later or every seven days. This is one
  public anecdote from 2017, not a representative or current survey. [2]
- SBC guidance starts with checking payment terms and invoice errors, then
  a polite reminder with details. It advises considering costs and client
  relationship before legal escalation. This supports fresh-source review
  and a hold rather than automatic escalation. [3]
- PayPal documents provider-managed subscription retries, up to twice per
  billing cycle, on a five-day cadence. A failed payment is not permission
  to retry blindly in a second tool. Inspect status and the provider's next
  retry first; Farthing does not initiate subscription captures/retries. [4]
- PayPal's dispute evidence depends on the actual reason and required
  evidence type. A receipt filename cannot establish that the contents
  exist, are authentic or satisfy that request. Farthing records inventory
  and guidance, not a declaration of sufficient evidence. [5]
- UK B2B late-payment guidance distinguishes agreed terms from the default
  late date. It describes statutory interest of 8% plus the Bank of England
  base rate, subject to contract conditions. Farthing does not infer legal
  entitlement, calculate interest, alter an invoice or threaten legal action.
  Announced reforms are not treated as enacted rules here. [6,7]

A practitioner article hosted by the Fair Payment Code describes cash-flow
pressure and the difficulty of going straight to legal recourse. It adds
qualitative context, not independent prevalence or proof of impact. [8]

## Constructed composite personas

These names and situations are design hypotheses, not real customers,
interviews, testimonials or validated segments. All monetary examples are
invented fixtures, not research statistics or actual account balances.

### Jules, independent designer: "I need to chase without ignoring a reply"

Jules has finished a design job. Client Amelia's fixture invoice F-1042 is
£450 and three days overdue in this demo. The client has replied outside the
app; Jules wants space to check that reply rather than send another nudge.

- Trigger: looking at an overdue balance while a client conversation is open.
- Current workaround, hypothesized: switch between invoice and messages,
  remember whether a reminder was sent, postpone the decision.
- Job: when reviewing a late invoice, see the current balance, explanation
  and exact words; add a hold if needed; approve only after inspecting.
- Built flow: brief -> source-linked artifact -> hold or individual approval
  -> fresh-state preflight -> activity and review export.
- Not solved: reading the actual email/thread, bank-payment reconciliation,
  relationship inference or measuring the client's reaction.

### Rowan, small studio operator: "One exception must not get lost"

Rowan reviews an invented £89 retainer failure and a payout showing £110
against a £120 expected recipient amount. Those values are deliberately
simple fixture examples, not expected loss rates or real customers.

- Trigger: a failed renewal or mismatched payout in an export.
- Job: import the actual structured record and ledger, see the specific
  mismatch, leave context, assign themselves a dated next step and review
  the current version, without starting a second charge or payout.
- Built flow: select subscription/payout -> JSON intake with source label
  -> deterministic plan -> case note/task -> source-version acknowledgement.
- Not solved: automatic provider synchronization, accounting reconciliation
  of fees/FX, recurring-payment recovery, assigned teams or task notifications.

### Ellis, small online merchant: "What evidence do I really have?"

Ellis receives a not-received dispute. The fixture inventory names a delivery
receipt; that name is not proof that the receipt was read or sufficient.

- Trigger: a seller-response requirement in an imported dispute record.
- Job: keep the reason, deadline field, document-name inventory and next
  check together, then inspect the actual provider requirements separately.
- Built flow: dispute JSON + inventory -> explicit reason-specific guidance
  -> manual note/task -> acknowledge source version -> export for review.
- Not solved: retrieving document contents, authenticating evidence, legal
  advice, computing provider deadlines, submitting a response or winning.

## Jobs-to-be-done and pains mapped to built features

| Situation / pain | Built feature | Boundary |
|---|---|---|
| "Is this still unpaid?" | Current invoice read, outstanding balance, source-linked studio | No bank cash or proof of payment |
| "What will be sent in my name?" | Exact draft in individual invoice review, fresh preflight | No chat-triggered bulk sending |
| "They already replied" | Persistent manual payer hold, immediately enforced pre-send | No email-reading or learned relationship memory |
| "When should I check?" | Three manual playbooks; configurable server-running routine | No promise of always-on cloud operation |
| "Why is that payout wrong?" | User-supplied ledger vs payout item comparison | No FX/fee accounting, no payout retry |
| "What happened to that renewal?" | Subscription status/balance/failure planner | No capture, retry or subscriber contact |
| "Does a filename prove evidence?" | Document-name inventory + explicit content-unverified flag | No document validation or submission |
| "What did we decide?" | Persistent case notes, versioned local review and activity | Manual notes are not verified facts |
| "The source changed" | Fingerprint/version increment, old review cleared, stale review refused | Not provider-side approval or immutable audit |
| "What is my next step?" | Dated local tasks with done/reopen, inbox | No reminder delivery or calendar integration |
| "Who can act?" | Reader/operator/owner permissions, CSRF and sessions | Shared local workspace, not per-client isolation |
| "Can my other tool read this?" | Six-tool authenticated read-only MCP | No mutation tool; connecting a client discloses data |

## Scope and interaction flows

1. Start local server; copy one-time code from its console to local setup;
   choose an owner password; login. A new owner account is not shipped.
2. Owner may create reader/operator users. Readers inspect/export; operators
   edit local cases/policies and approve invoice reminders; only owner creates
   users and read-only MCP tokens. All accounts see the same workspace.
3. Review live/current invoice summaries from the configured provider client.
   The current demonstrated mode is invented fixture data + rules engine.
4. Prepare reminder -> inspect exact draft -> hold/pause/dismiss/approve.
   The application rechecks amount, currency, identity, recipient and invoice
   status, enforces policy/cooldown and blocks concurrent/uncertain retries.
5. Import subscription, payout or dispute JSON with an honest source label.
   Imported text is untrusted data, never an instruction or authorization.
6. Inspect plan/source -> save note/task -> acknowledge current source version.
   Updated source identity increments version and clears acknowledgement.
7. Export a local review bundle. This is not proof of a payment or delivery.
8. Optionally connect an intended MCP client with a seven-day read-only token;
   keep the token private; owner can revoke all such tokens.

## Success metrics: definitions, not invented outcomes

| Metric | Definition / collection | Current evidence |
|---|---|---|
| Unsafe stale send | A changed or held/paused invoice draft sends despite guard | Fixture automated guard tests; no production rate |
| Source version correctness | Changed source resets review; old version cannot be reviewed | Unit + real API + browser checks |
| Role enforcement | Reader or MCP token cannot mutate | Real HTTP and authenticated MCP tests |
| Case persistence | Import/note/task survives reload/restart | Browser reload and real server-restart tests |
| Operator comprehension | Can a person identify source, next action and send boundary? | Not yet tested with target users |
| Review time | Time from finding an exception to a correct reviewed next step | No customer measurement or savings claim |
| Payment outcome | Paid balance and timing verified against provider/bank records | Not measured; no recovery/revenue claim |
| Model action / tone | Correct label against synthetic expected decision | 205/240 action; 187/240 combined; zero fallbacks |
| Matched model comparison | Same 37 case IDs, paired outcomes | 30/37 vs 25/37 action; not statistically conclusive |
| Laptop suitability | Verified CPU-only placement and end-to-end task latency | Not verified on an ordinary laptop |

Do not turn passing tests into a claimed real-user error rate. A usability
study and authorized sandbox integration are the next evidence needed.

## Security model

Threats considered: unauthenticated local API use, hostile web origins,
reader privilege escalation, forged/stale review, embedded markup, guessed
passwords, leaked archive credentials and excessive trust in imported text.

Built controls:
- Loopback-only binding, expected Host and foreign-Origin checks.
- One-time local owner setup; salted scrypt password hash (N=32768, r=8,
  p=1), no plaintext storage. Auth DB written with mode 0600.
- Random server-side sessions, HttpOnly/SameSite Strict cookies, 8-hour
  maximum/30-minute idle expiry. Restart clears sessions. Maximum 100
  concurrent sessions; oldest is dropped when that limit is reached.
- CSRF tokens on authenticated mutations, server role enforcement. Login
  throttled after five failed attempts for 15 minutes; not global API QoS.
- Owner-issued hashed seven-day bearer tokens, strictly read-only, revocable.
- Nonce-based script CSP, frame denial, no-sniff/no-referrer headers; escaped
  source text. Styles allow inline CSS for the existing UI.
- Request/case/note/task bounds; source fingerprint/version checks; no
  document links fetched. Local activity is not an immutable audit trail.
- No application package dependencies. UI tests optionally use Playwright.
  Credentials/state/auth DB, traces and weights excluded from source ZIP.

Trust assumptions and limits:
- Someone who controls the local machine/files/process can bypass this app.
- Local HTTP does not set a Secure cookie; no TLS, MFA, recovery, user-delete
  UI, per-record tenancy, encryption at rest, independent audit or pen test.
- Do not expose the server via a tunnel/public host. Auth does not make a
  local prototype production-safe. Read/export permission exposes all cases.
- `FARTHING_AUTH_MODE=open-fixture` is an explicit tutorial/test-only bypass,
  honored only when FARTHING_MOCK=1; do not use it with private data.
- PayPal environment secrets are separate. Local login is not PayPal OAuth.
- Actual sandbox auth/calls, third-party MCP, webhook validation and production
  account operations are unverified; no security certification follows.

Final automated run: 117/117 Node tests pass; 15 secure browser workflow checks
pass with zero page or console errors. Legacy desk/studio UI checks are
separate and explicitly use open-fixture mode.

## Verification boundary

Built and automated checks: current local fixtures; deterministic case plans;
source revisions/notes/tasks/persistence; exact-cents currency-separated aging;
local auth/roles/CSRF/CSP/login limit/session expiry; read-only token and MCP.
The checked UI is real running application footage, edited/retimed, not a
live-model performance test or authenticated PayPal demonstration.

Unverified: target-user demand, willingness to pay, collection improvements,
real customer adoption, production reliability/security, authenticated sandbox,
ordinary-laptop latency, third-party client interoperability beyond tested
protocol calls, public eligibility/declarations and prize outcomes.

## Source ledger

All pages fetched/read 11 November 2026. No interviews were conducted.

1. SBC/DBT commissioned research summary, 31 July 2025, primary research
   publisher summary. High confidence in attribution/denominators; estimates
   are not a user-level forecast.
   https://www.smallbusinesscommissioner.gov.uk/late-payments-research-2/
2. First-person freelancer post, 17 February 2017. Community anecdote, old
   and self-selected; useful for wording the timing dilemma only.
   https://www.reddit.com/r/freelance/comments/5uo95i/when_to_send_followup_billing_email/
3. SBC unpaid-invoice guidance. Primary practical guidance, not legal advice.
   https://www.smallbusinesscommissioner.gov.uk/help-and-guidance/all-advice/help-with-unpaid-invoices/
4. PayPal subscriptions documentation, updated 14 October 2026. Primary
   vendor behaviour documentation; account settings still need checking.
   https://developer.paypal.com/subscriptions/payment-failure-retry
5. PayPal dispute reasons/evidence, updated 2 October 2026. Primary provider
   requirements, not verification of any actual disputed transaction.
   https://developer.paypal.com/disputes/reasons-evidence
6. GOV.UK, when commercial payment becomes late. Primary legal guidance.
   https://www.gov.uk/late-commercial-payments-interest-debt-recovery
7. GOV.UK, interest on late commercial payments. Primary guidance, subject
   to contract/jurisdiction facts; no current base-rate value used.
   https://www.gov.uk/late-commercial-payments-interest-debt-recovery/charging-interest-commercial-debt
8. Amy Russell practitioner article hosted by the Fair Payment Code, 7 May
   2025. Attributed qualitative perspective, not survey evidence.
   https://www.smallbusinesscommissioner.gov.uk/fpc/blogs/the-true-cost-of-late-payments/

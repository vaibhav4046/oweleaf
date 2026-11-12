# Oweleaf: problem, first user and evidence

Research checked 11 November 2026. No customer interviews, paid users, adoption, collection uplift or time saving claimed. Personas are design hypotheses, not people we interviewed.

## The problem we choose

A UK solo service freelancer who already sends invoices through PayPal must decide which overdue invoice needs a reminder, what the reminder should say, and when a client should be left alone. That decision is split between invoice state, prior follow-up and a reply or promise remembered elsewhere. The core product brings current invoice facts, exact draft words and an explicit wait note into one approval review.

It does not eradicate late payment. It cannot force a customer to pay, solve insolvency or corporate payment runs, read an email reply, prove work was delivered, or replace accounting. The narrow problem it can test is avoidable review friction and inappropriate follow-up. Real outcome validation remains necessary.

## Who is first, and who is not

**Jules, solo designer or consultant:** UK-based, sends business-client invoices through PayPal, no dedicated receivables employee. Needs a calm follow-up that preserves the relationship. Constructed persona. £450 / three days late / Amelia are invented test data, not prevalence or customer evidence.

Why this segment: direct relevance of freelancer payment research, a reachable single-user workflow, and the invoice source already implemented. "Solo designers and consultants using PayPal" is a deliberate first test group, not a research-proven largest or highest-paying market. No reliable PayPal-specific segment size established.

Farmers, STEM students and nursery students were examples of interface simplicity in the brief, not validated target customers. Finance teams need multi-user accounting, integrations and controls this local prototype does not provide. Online merchants' subscription/payout/dispute work remains a secondary experimental workspace. They do not belong in this pitch's main journey.

## Evidence by quality and denominator

1. IPSE, Fred Hicks, 2 May 2024. Q1 2024 Freelancer Confidence Index: 32% experienced payment delay in preceding 12 months. The article contrasts 35% in its 2022 survey. This is dated research, not a 2026 prevalence claim. It describes payment-term ambiguity, invoice approval and scheduled payment runs. Those root causes limit what a reminder app can solve.
https://www.ipse.co.uk/articles/heres-how-clients-get-away-with-paying-freelancers-later

2. IPSE / YouGov, 19 February 2026, "What the ideal client looks like". 1,043 self-employed people; fieldwork 19 Sep-13 Oct 2025, weighted: 29% chose payment reliability as a top-three client attribute, 26% previous client experience, 17% communication. Self-employed is broader than our first segment. Supports relationship/reliability, not purchase intent.
https://www.ipse.co.uk/articles/what-the-ideal-client-looks-like-according-to-the-self-employed

3. DBT / London Economics, July 2025 primary report. Table 7, printed p12: annual UK economic cost central estimate £10,745m. Components £m: business closures 3,214; investment 1,714; staff chasing 2,259; collection 1,132; legal 1,213; supply-chain finance 1,213. Sum = 10,745. 90% interval for total 4,739-17,643m. Modelled economy-wide cost, not all cash burned, lost revenue, product TAM or achievable saving. Report warns of possible displacement/overestimation and unquantified costs.
Table 14 p24: affected micro businesses (0-9 employees) spend 75 hours/year chasing, versus 20 across all micro businesses. Table 15 p25: £1,273/year for affected micro businesses versus £343 across all. Micro is not solo freelancer. Denominators must stay next to figures. Average labour rate £16.92/hour; rounded hours times rate need not equal the separately published rounded cost. We use published £1,273 rather than pretend exact reconstruction.
Do NOT add £26bn of late invoices owed at a point in time to annual cost. Stock and annual flow differ. Do NOT mix Table 4 business opportunity-cost categories with Table 7 economy categories.
https://assets.publishing.service.gov.uk/media/688a089a6478525675738ff9/late_payments_research_impact_on_uk_economy.pdf
https://www.smallbusinesscommissioner.gov.uk/late-payments-research-2/

4. Reddit, r/freelance, "When to send follow-up billing email?", 2017. A public author asks about net-15 reminders and days to follow up; comments mention existing automation. Actual screenshot captured. Anecdote only, not representative or current prevalence. No identity attributed beyond the displayed public handle. Screenshot crop removes unrelated ads and account UI.
https://www.reddit.com/r/freelance/comments/5uo95i/when_to_send_followup_billing_email/

5. FreeAgent, 30 May 2024, survey of 1,600+ freelancers/small-business owners. 71% waited more than a month; 40% more than three months; 18% wrote off over £1,000. Vendor survey with different sample and wording, not pooled with IPSE. Supports severity but not neutral purchase proof.
https://www.freeagent.com/blog/research-reveals-payment-problems/

6. FSB / GoCardless commissioned survey, 26 February 2025, 2,000+ small businesses. 63% spend time chasing; "up to £5,200" is not an average. Broader than freelancers; commissioned evidence. No summed cost from this plus DBT.
https://www.fsb.org.uk/resources/article/late-payments-and-payment-methods-in-small-businesses-MCG3GFLR7YJFFV7EZM7C3XPPYYXM

7. Qualitative expert/vendor material read: ProInvoice LinkedIn article and Fundera YouTube video. Helpful for workflow language, not independent causal data; no figures or testimonials from them used as validation.
https://www.linkedin.com/pulse/best-way-chase-unpaid-invoices-freelancer-proinvoice
https://www.youtube.com/watch?v=pi0CRab6raA

## Competitive test

DueKind already offers approval-first receivables, memory, manual CSV, Gmail/Outlook and voice. FreeAgent and other invoicing products already automate reminders. Therefore "AI reminders" and "human approval" are not a unique selling proposition. Oweleaf's proposed narrow angle is an inspectable local review for PayPal invoices with source-linked draft, explicit persistent wait decision and fresh pre-send checks. This is a positioning hypothesis, not a proven exclusive feature or market moat. A user who needs accounting or connected email may be better served by an existing product. General-purpose cloud agents remain broader; see COMPETITORS.md.
https://www.duekind.com/
https://www.duekind.com/pricing
https://www.freeagent.com/blog/research-reveals-payment-problems/

## The complete first journey

1. Run the local app and create a local owner from its one-time console setup code. No account is bundled. Login lands on home, not JSON intake.
2. Read the explicit fixture/account status. Choose an invoice; paid and not-due invoices cannot be sent a reminder.
3. Check recipient, outstanding balance, days late and exact draft. Demo uses a deterministic rules engine; evaluated model is separate.
4. If a client replied elsewhere, add a manual wait note. It blocks that payer across invoices. It survives reload/restart until released. No email auto-detection implied.
5. Release the note only when ready, then approve. Server re-reads invoice status, amount, currency, recipient and policy; rejects changed, paid, held, paused or in-flight conditions. In fixture mode, the action is explicitly simulated.
6. The result is recorded. Uncertain delivery is not blindly retried. Advanced evidence/activity/settings live under More.

## How we will know it helps

Not measured yet: user comprehension, review time, inappropriate chase rate, actual payment time, willingness to pay. Proposed test: recruit 5-8 consented solo freelancers who already use PayPal invoices; have them review matched realistic scenarios in their existing workflow and Oweleaf, counterbalance order, record correct wait/send decisions and time per review. No real customer sends during usability testing. Set baseline before any saving claim. Test invoice changes, promises, recent reminders and uncertain delivery. Never equate automated regression tests with user research.

## Founder fit

Vaibhav's public ReqKeeper repository is directly relevant prior build work: it separates an agent's proposal from human approval of a money action. The public repository and its self-described purpose are verified, but not independently audited here. No awards, professional collections credentials, personal freelancer pain, customer testimonials or unsupported performance counts claimed.
https://github.com/vaibhav4046/reqkeeper

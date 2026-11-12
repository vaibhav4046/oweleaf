# Oweleaf — judge-first demo script

This is the evidence-led script for a replacement or trimmed walkthrough. It is
written for the PayPal AI Hackathon's five judging categories and keeps the
first 45 seconds focused on the required PayPal + AI proof.

The public browser sample is a **fixture-only** experience. It has no backend,
model call, or sending. The authenticated local run is the path that exercises
the PayPal Sandbox client and local model. Label the mode on screen before any
action; never present fixture output as a live payment or customer result.

## 0–12 seconds — problem and audience

Show the invoice queue, then say:

> “A solo freelancer has an overdue PayPal invoice. The dangerous shortcut is
> sending another reminder after the client has paid or replied. Oweleaf makes
> the decision inspectable before anything leaves the account.”

On-screen label: `Oweleaf / PayPal Sandbox + local AI / synthetic test data`.

## 12–28 seconds — prove PayPal and AI immediately

Open one invoice from the PayPal-backed source read. Point to the invoice
number, recipient, currency, amount, status and due date. Select **Draft with
AI** and show the exact draft, tone and provider/model label.

Say:

> “The source facts come from the PayPal invoice read. The local model drafts
> the words; deterministic policy code controls whether a send is allowed.”

Do not describe a rules fallback as a model result. If the fallback is shown,
leave its explicit `rules fallback` label visible.

## 28–45 seconds — show the differentiator

Add a payer hold or choose **Wait for the client**, then attempt the approval.
Show the blocked action and the human-readable reason. Immediately show the
fresh-source check that compares status, amount, currency, recipient and
invoice number before a reminder request.

Say:

> “The model cannot override a hold, and an old draft cannot approve against a
> changed invoice. Oweleaf rereads the source at the send boundary.”

This is the most important 45 seconds: it proves PayPal context, AI drafting,
human approval and the safety boundary in one continuous path.

## 45–72 seconds — prove a successful reviewed path

Use a second synthetic overdue invoice with no hold. Inspect the exact subject
and note, click **Approve**, and show the provider response/activity record.
Keep the `synthetic` and `provider returned success` labels visible. Do not say
the client received or paid anything.

## 72–90 seconds — technical evidence and honest limits

Show the repository and one evidence page:

- `npm test` — 152/152;
- `node run.mjs --test` — 152/152;
- stale/paid/changed-recipient/uncertain-delivery tests;
- public fixture sample URL and local authenticated setup.

Close with:

> “Oweleaf is a local review layer for PayPal invoice follow-up. It does not
> claim recovered money or customer outcomes. Its concrete contribution is
> making the source, draft, wait decision and final recheck visible before a
> human sends.”

## Recording checklist

- Use one current video URL everywhere; remove older links from README and
  evidence files.
- Keep the PayPal Sandbox/API response and AI provider label visible before
  45 seconds.
- Keep fixture-only screens labelled; never show a synthetic invoice as a real
  customer account.
- Avoid copyrighted music and third-party screenshots unless permission is
  documented.
- Record a clean run from a fresh temporary state and keep the exact commit,
  command and timestamp in the release notes.

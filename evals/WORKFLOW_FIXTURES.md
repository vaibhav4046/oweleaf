# Experimental workflow fixture tests

Run date: 10 November 2026. Full `npm test`: 51 passed, 0 failed.

This is software test coverage, not an AI accuracy score. No model or live
PayPal calls occur in these fixtures. The prototypes are not wired into
the default invoice dashboard or scan loop.

| Prototype | Fixture cases passed | Tested scope |
|---|---:|---|
| Subscription payment failure | 12/12 | Active and suspended failed balances, zero balances, no failures, pre-activation and closed statuses, incomplete and malformed billing data |
| Payout reconciliation | 12/12 | Recipient amount/currency matching, failed and unclaimed items, pending batches, missing and unexpected items, duplicate IDs and incomplete pagination |
| Dispute evidence inventory | 12/12 | Seller-response review, resolved and waiting states, unknown statuses, absent documents or deadlines, invalid evidence inventory, untrusted message content |

Two additional tests cover encoded API paths with GET-only readers and
routing a workflow to the requested reader. Existing invoice tests account
for the other 13 tests in the full 51-test suite.

## What runs

```bash
npm test
npm run workflows:demo
```

The demo prints three fixture plans. Subscription output requests review,
not an email. Payout output flags a failed item, not a retry. Dispute output
lists only supplied filenames, not invented evidence or a submission.

Only GBP, USD and EUR two-decimal amounts are supported by these prototype
money comparisons; other or malformed amounts require manual review.
Incomplete payout pagination requires review rather than a false balanced
result. Fees are not netted against expected recipient amounts. No fixture
checks PayPal permissions, real account data, dispute-specific evidence
requirements, email delivery or actual money movement.

## API documentation checked

The new client readers follow these PayPal documentation pages, inspected
on the run date:

- Subscription details and `fields=last_failed_payment`:
  https://developer.paypal.com/api/subscriptions/v1/subscriptions-get
- Payout batch details, item status and pagination:
  https://developer.paypal.com/api/payments.payouts-batch/v1/payouts-get
- Dispute details, status, response deadlines and evidence fields:
  https://developer.paypal.com/api/customer-disputes/v1/disputes-get

Reader implementation and fixture tests do not prove that a given PayPal
account has access to these APIs. Authenticated sandbox testing is pending.

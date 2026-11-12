# Real sandbox + local model evidence, 12 November 2026

00:30 OAuth and list succeeded after two credential pairs failed. Original failures retained. Created only wholly synthetic invoices, no real person's data. GBP 1, GBP 450 and GBP 1280 overdue; GBP 890 not due. Fields follow public PayPal service/freelance template guidance, not copied personal invoices.

00:32 real GBP1 source -> local CPU application model adapter produced correct gentle draft, no fallback,31.51s. Separate sandbox reminder returned success using explicit test words, not model output. Source and metadata read back. No payment or inbox receipt inferred.

00:44 authenticated application run: PayPal list of4 synthetic invoices -> local v2model-generated GBP450 draft -> persistent wait -> reload/reselect target -> release -> approval click -> actual sandbox reminder API success.8/8 browser checks, actual footage. No simulated provider in this run. The source UNPAID/amount/due date support the words. No claim the AI causes better collection decisions or wins against rules.

Earlier full-app inference hit60s limits. Successful recorded run uses explicit105000ms timeout and300output-token cap, with the other overdue cases deliberately held to bound this run to one model invoice. Default application timeout stays30s; this can fall back. One-core hosted CPU, not normal-laptop latency evidence. Total successful run72.8s including setup/UI; not standalone inference latency.

Harness failure before final run: reload selected the first held invoice, not the intended one; approval stayed disabled and no send happened. Corrected harness reselects the target. Original failure retained.

Do not replay create/send scripts against existing invoice numbers. They are test preparation, not the main app. Use a new isolated sandbox workspace and inspect provider state before any rerun. No live accounts or real money were used.

Public sample structures:
https://www.paypal.com/us/brc/article/freelancer-invoice-template-online
https://www.paypal.com/us/brc/article/free-service-invoice-template-online
Sandbox notifications remain in sandbox per:
https://developer.paypal.com/sandbox-testing/calls

# Bounded benchmark report

Two different studies, not pooled:

1. Synthetic model policy agreement: see evals/RESULTS.md, raw traces and paired statistics. Rules label held-out data and score240/240by construction. Fine-tune205/240action,187/240combined. Matched37cases local30action/28combined versus giant25/25, pairedp.125/.508, no conclusive advantage. This does not measure real customer drafting, collection or robustness.
2.11NovemberlocalHTTPload: evals/OLYMPUS_AUDIT.json. Three300requestworkloads at1/10/50concurrency,5fixtureinvoices, authenticatedGET/api/desk,0failed, thresholdp95<1000ms. Node22/1coreXeon/2GB environment. Firstloadreport retainedR1. No modelinferenceorPayPalnetwork included. Coldstart andRSS included; CPUticks are observedprocesscounter,notnormalizedutilization.

Reproduce normal suite `npm test`. Dev audit needs playwright+axe-core and Chromium, run scripts/olympus-audit.mjs from projectroot. Inputs deterministicfixture, no externalAPIcharges. No normal-laptopCPUlatencyclaim.

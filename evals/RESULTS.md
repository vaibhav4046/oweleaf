> Current status, 12 November 2026 00:56 GMT: actual PayPal sandbox + local CPU model + UI wait/reload/release/approval reminder path passed8/8. The four invoices were wholly synthetic; reminder API returned success, not proof of receipt/payment. Public demo https://youtu.be/rbd67UlYfJY and source https://github.com/vaibhav4046/oweleaf exist. Devpost registration/submission is not implied. One successful gentle case at105s limit does not erase prior failures. Exact inference weights are in the public folder linked from root README; frozen retraining dataset remains incomplete. Earlier pending statements below are historical checkpoint records, superseded by evals/SANDBOX_FINDINGS.md.

# Farthing - measured results

Measured on 10-11 November 2026. These are synthetic invoice-decision tests,
not evidence of successful debt collection, business outcomes or general
assistant ability. Live PayPal integration testing is still pending.

## Held-out synthetic scenarios

`evals/scenarios_big.json` contains 240 scenarios generated with seed 1337,
separate from training seed 42: 93 wait, 30 gentle, 59 firm and 58 final.
The leak check found no shared payer names, amounts or exact invoice lines
against the 1,500 generated training rows. This checks those fields only;
it does not establish independence of reasoning patterns. Training and
labels follow the same deterministic invoice rules.

All model accuracies below exclude heuristic fallbacks. Intervals are 95%
Wilson intervals, corrected after an interval-calculation bug was found.
The model decisions and hit counts did not change.

| Brain | n | Action correct | Action + tone correct | Fallbacks |
|---|---:|---|---|---:|
| Rules ladder, reference only | 240 | 240/240, 100.0% [98.4, 100.0] | 240/240, 100.0% [98.4, 100.0] | 0 |
| Farthing v2, history-aware LoRA | 240 | 205/240, 85.4% [80.4, 89.3] | 187/240, 77.9% [72.3, 82.7] | 0 |
| Farthing v3, boundary-contrast LoRA | 240 | 192/240, 80.0% [74.5, 84.6] | 163/240, 67.9% [61.8, 73.5] | 0 |
| Nemotron 3 Ultra 550B, completed cloud subset | 37 | 25/37, 67.6% [51.5, 80.4] | 25/37, 67.6% [51.5, 80.4] | 0 accepted |

V2 is selected for shipping. V3 regressed on both metrics. Both versions
were evaluated before this choice, so this set also influenced model
selection; a further untouched test set would strengthen the result.

The rules ladder produces the labels and scores 100% by construction.
It is a reference, not a competing learned model. On these rules the
simpler deterministic system is more accurate than either language model.

### Matched giant comparison

The preselected Nemotron subset has 37 distinct scenarios: 14 wait,
5 gentle, 9 firm and 9 final. All 37 now have valid non-fallback model
results. Twelve outstanding calls were completed after the free daily
quota reset on 11 November. Earlier reporting counted three duplicate
attempts as extra cases; results here deduplicate by scenario ID and
exclude every fallback. No missing cases remain in this subset.

| Brain, same 37 scenario IDs | Action | Action + tone |
|---|---|---|
| Farthing v2 | 30/37, 81.1% [65.8, 90.5] | 28/37, 75.7% [59.9, 86.6] |
| Nemotron 3 Ultra 550B | 25/37, 67.6% [51.5, 80.4] | 25/37, 67.6% [51.5, 80.4] |

V2 is numerically higher on this small matched synthetic subset, but the
paired evidence is not statistically conclusive. For action, v2 alone is
correct on 6 cases and the giant alone on 1 (two-sided exact McNemar
p=0.125). For action+tone those counts are 6 and 3 (p=0.508). Do not
claim general superiority, a proven giant-beating result or real-world
business benefit. This subset is rules-derived, model selection used the
larger test set, and there was one successful inference per case, not a
multi-seed stochastic stability test.

The exact cloud model ID is
`nvidia/nemotron-3-ultra-550b-a55b:free`. Matched raw decisions are in
`GIANT_MATCHED_RAW.json`; paired counts and intervals are in
`PAIRED_STATS.json`. Both sides are compared on identical IDs, not v2's
full 240-case score against the giant's subset score.

The attempted free DeepSeek endpoint returned unavailable and supplied no
valid baseline. This is not a direct DeepSeek comparison.

## Golden set used during development

Ten scenarios, seven expecting a reminder. This set was inspected while
training and fixing the project, so it is a development set, not an
untouched test set.

| Brain | Action | Action + tone | Fallbacks |
|---|---:|---:|---:|
| qwen3:0.6b base | 3/10 | 3/10 | 0 |
| gemma3:1b base | 8/10 | 3/10 | 0 |
| Farthing v1 | 8/10 | 6/10 | 0 |
| Farthing v2 | 9/10 | 6/10 | 0 |
| Farthing v3 | 8/10 | 5/10 | 0 |
| Nemotron 3 Ultra 550B | 7/10 | 6/10 | 0 |

Base qwen3:1.7b produced eight heuristic fallbacks in ten attempts. Its
combined final-decision score is not a valid standalone model score and
is excluded from the table.

## Hardware and latency caveat

Inference ran through Ollama on a T4-backed Colab runtime. Prior text called
this CPU-only and laptop-class without preserving processor-placement
proof. That claim is withdrawn pending a forced CPU run. Observed local
latencies around one second and cloud latencies around 4.5-14.4 seconds
are not a controlled hardware comparison. Do not claim a laptop speedup
or a 10x model speed advantage from them.

## Reproduce

```bash
BRAIN_PROVIDER=ollama OLLAMA_MODEL=farthing2 node src/harness/eval.js
EVAL_FILE=evals/scenarios_big.json BRAIN_PROVIDER=ollama OLLAMA_MODEL=farthing2 node src/harness/eval.js
node evals/leak_check.js
```

Every decision is traced with scenario ID, expected and actual actions,
tone, latency and fallback status. A fallback means the rules ladder made
the decision instead of the model. Never score a fallback as a model win.

## Scope limits

The model benchmark covers invoice wait/reminder/tone decisions only.
Separate deterministic workflow prototypes have 36 fixture scenarios for
subscription failures, payout reconciliation and dispute-evidence inventory
(see WORKFLOW_FIXTURES.md). Those are software tests, not model or live
PayPal results. Job applications and computer control remain unbuilt
roadmap ideas. Human approval remains required before any reminder is sent.

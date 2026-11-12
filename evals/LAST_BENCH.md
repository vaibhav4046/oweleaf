# Farthing cost/latency benchmark - 2026-11-12T07:58:36.993Z

Scenarios per brain: 10

| brain | model | p50 | p95 | fallbacks | tokens in/out | cost per 1,000 decisions |
|---|---|---|---|---|---|---|
| heuristic | rules-ladder | 0 ms | 0 ms | 0 | 0/0 | 0.0000 (local, electricity only) |
| cloud baseline | (not configured) | - | - | - | - | set OPENAI_* in .env to measure |

Cloud cost is computed from list prices in .env (OPENAI_PRICE_PER_MTOK); it is price arithmetic, not measured spend.

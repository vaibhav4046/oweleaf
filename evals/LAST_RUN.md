# Farthing eval run - 2026-11-12T07:58:36.802Z

Brain: heuristic / rules-ladder
Scenarios: 10 (7 expect a reminder)

**Action accuracy: 100.0% (10/10)**
**Action+tone accuracy: 100.0% (10/10)**
SLM fallbacks to heuristic: 0
95% Wilson CI: action [72.2%, 100.0%], action+tone [72.2%, 100.0%]

| scenario | expected | got | ok | latency |
|---|---|---|---|---|
| E01-gentle-3d | remind/gentle | remind/gentle | yes | 0 ms |
| E02-gentle-boundary-7d | remind/gentle | remind/gentle | yes | 0 ms |
| E03-firm-boundary-8d | remind/firm | remind/firm | yes | 0 ms |
| E04-firm-14d-after-gentle | remind/firm | remind/firm | yes | 0 ms |
| E05-final-30d | remind/final | remind/final | yes | 0 ms |
| E06-paid-wait | wait | wait | yes | 0 ms |
| E07-not-yet-due-wait | wait | wait | yes | 0 ms |
| E08-draft-wait | wait | wait | yes | 0 ms |
| E09-final-boundary-22d | remind/final | remind/final | yes | 0 ms |
| E10-firm-boundary-21d | remind/firm | remind/firm | yes | 0 ms |

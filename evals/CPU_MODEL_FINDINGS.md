# Actual CPU-only model checks, 11 November 2026

llama.cpp b12283 with the restored v2 GGUF, one logical Xeon CPU and 2 GB RAM, no GPU. This is hosted CPU evidence, not a normal-laptop benchmark. No PayPal data was sent to the model.

## Four single-draft attempts

- R0, 08:51: cold load 26.75 s, inference 28.83 s. Invented a sent date and seven-day payment demand. Failed.
- R1, 08:52: warm file-cache load 2.43 s, inference 27.17 s. Fixed due/sent confusion but invented a seven-day demand. Guard refused it. Failed.
- R2, 23:12: load 5.85 s, inference 31.18 s. Removed deadline but said three days BEFORE the due date despite source being three days overdue. Manual review found the original guard missed this. Added a regression and refusal for this known class. Failed.
- R3, 23:15: load 3.44 s, inference 33.81 s. Correct source-grounded gentle draft on one synthetic invoice. Manually checked. A single pass is not reliability or useful-AI proof.

Raw requests and responses are preserved in CPU_MODEL_SMOKE_R0.json, _R1.json, _R2.json and CPU_MODEL_SMOKE.json (R3). The guard-pass field records only the known-class checks at the time of that run. Manual review takes precedence over it.

## Actual application-provider adapter

CPU_PROVIDER_CHECK.json, 23:16: actual createBrain OpenAI-compatible adapter to local llama.cpp. Explicit 60-second timeout, not the application default 30 seconds.

- 12-day overdue invoice: model invented a deadline. Guard refused it, rules fallback returned. 35.31 seconds. Correct action does NOT count as model draft success.
- Paid invoice: model returned wait, no fallback. 19.57 seconds. Correct action.

No meaningful model benefit over rules demonstrated. Do not present fallback words as model output. The model's historical training data includes the very deadline demands now prohibited; it has not been retrained. Original data/results are preserved, not silently relabelled. The current rules firm/final fallback templates have been repaired to remove unsupported deadlines. Human review remains mandatory; guard checks are not exhaustive factual validation or injection immunity.

## Reproduce

Set LLAMA_SERVER to the free upstream llama.cpp binary and OWELEAF_GGUF to the restored model file. Run `python scripts/cpu-model-smoke.py` or `node scripts/cpu-provider-check.mjs`. Preserve old result files before running: scripts overwrite their named output. Both launch an isolated local process and terminate it. Weights and binary are not shipped in this source archive. Model availability and exact licensing are described in training/MODEL_CARD.md.

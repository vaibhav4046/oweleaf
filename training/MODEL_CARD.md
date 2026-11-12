# Selected Farthing v2 model

- Basis: Qwen3-1.7B, task-specific LoRA, Q4_K_M GGUF export.
- Filename after joining: `farthing-v2-q4_k_m.gguf`.
- Bytes: 1,107,409,312.
- SHA-256: `8995426484543fbc2d7dc24234eadddebd8ec4d2194be6953b576ae9922e3c7b`.
- Identity verified against the model layer in the actual `farthing2`
  Ollama manifest, not a later training directory that was overwritten.
- Selected after v2 and v3 were compared. See `evals/RESULTS.md` for
  measured synthetic-task results, limitations and model-selection caveats.

The project code's MIT licence is not a claim that all underlying model
weights have the same licence. Review the base model's terms before public
redistribution. The training generator in this repository includes the
later boundary-contrast experiment; it is not a frozen reproduction bundle
for every v2 training row.

To import the restored GGUF into Ollama, place it next to a copy of
`SHIPPING.Modelfile`, the template and parameters exported from the actual
measured `farthing2` model. Run `ollama create farthing2 -f SHIPPING.Modelfile`
in that folder. Only the FROM path has been changed to the restored local
filename. Re-run the harness after importing before assuming identical
results on another machine.

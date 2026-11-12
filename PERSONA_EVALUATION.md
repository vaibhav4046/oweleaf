# Simulated agent-as-user evaluation

Generated 12 November 2026 from the current Oweleaf behavior. These are deterministic AI-agent test actors, not real users, interviews, testimonials, or customer-impact evidence.

## Reproduction

```bash
node scripts/persona-eval.mjs
```

The harness creates an isolated temporary workspace for each persona, runs the real scan/decision/approval code against the PayPal-shaped fixture client, and writes `evals/PERSONA_EVALUATION.json`.

## Results

**9/9 simulated personas passed their defined task.** The result measures workflow behavior and guardrails; it does not establish adoption, recovered money, willingness to pay, or human usability.

| Persona | Task evidence | Outcome | Friction found |
|---|---|---|---|
| Solo freelancer | 5 invoices scanned, 3 drafts, 1 approved provider call | Pass | Private setup needs PayPal credentials and local auth |
| Relationship-first studio operator | Patient playbook surfaced F-1038/F-1029 and excluded F-1042 | Pass | Thresholds are configured manually |
| Cautious operator | Paid invoice became `stale`; 0 sends | Pass | Fresh provider read adds a step |
| Freelancer with outside conversation | Payer hold blocked approval; 0 sends | Pass | Hold reason is manual |
| Unreliable-connection operator | Failure became `delivery_unknown`; retry blocked | Pass | Manual provider-history reconciliation required |
| Security reviewer | Recipient drift blocked; 0 sends | Pass | Legitimate edits require a fresh proposal |
| Time-poor user | `send all` returned a no-side-effect boundary | Pass | Must open one invoice to act |
| PayPal sponsor judge | Invoice source and `/remind` mutation traced end-to-end in fixture mode | Pass | Real Sandbox replay is credential/runtime dependent |
| Three-minute judge | 5 invoices, 3 complete tone-labelled drafts in 1 ms locally | Pass | Video must make fixture/Sandbox boundary obvious |

## What this changes in the judging case

The product now has reproducible simulated-user evidence for its strongest claim: a narrow review boundary that combines source facts, a draft, a wait/send decision, and a fresh pre-send check. The evidence also exposes the remaining product work: setup friction, manual context entry, and the need to show the PayPal Sandbox + AI path immediately in the presentation.

Do not describe these agents as customers or users. Their results support technical and workflow claims only.

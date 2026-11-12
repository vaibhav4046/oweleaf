# Red-team report

Updated 12 November 2026. Severity: P0 blocks the demo; P1 breaks a critical journey or creates a severe trust/security issue; P2 has a workaround; P3 is minor.

## Attacks executed

| Attack | Result | Severity | Evidence/status |
|---|---|---:|---|
| Concurrent state writes | Fixed by unique per-process staging files and parent-directory creation | P1 → fixed | `src/agent.js`; `npm test` 152/152 |
| Paid/stale invoice approval | Blocked after fresh provider read | P1 → fixed | reliability tests |
| Changed amount, recipient, currency or invoice number | Original proposal rejected as changed | P1 → fixed | reliability tests |
| Hold/pause introduced during model/preflight | Approval blocked | P1 → fixed | reliability tests |
| Provider timeout/uncertain delivery | No automatic blind replay | P1 → fixed | reliability tests |
| Model timeout, malformed JSON, invented dates/threats | Rules fallback and bounded factual guard | P1 → fixed | brain/reliability tests |
| Reader/operator/CSRF/bearer misuse | Mutations rejected; MCP read-only | P1 → fixed | auth/secure tests |
| Corrupt state/auth | Quarantine and fail-closed recovery | P1 → fixed | reliability tests |
| Untrusted imported source text | Retained as data; no link fetch/instruction execution | P1 → fixed | workspace tests |
| Run documented demo on Windows 11 | Every page returned `{"error":"not found"}`; guard used a hard-coded `/` separator | P0 -> fixed | `src/server.js`; browser check of all ten pages, 12 Nov |
| Run test suite on Windows 11 | 6/152 failed, EPERM on concurrent rename of `state.json` | P1 -> fixed | `src/persistence.js` bounded retry; 152/152 x3 on Windows |
| Check remind payload against PayPal's OpenAPI spec | Spec: user-provided `subject`/`note` "will not be honored". UI claimed the drafted words were sent | P1 -> fixed (copy corrected, copy/email actions added) | `openapi/invoicing_v2.json` in paypal/paypal-rest-api-specifications, retrieved 12 Nov |
| Live PayPal credentials/model server absent | Cannot verify network path in this workspace | P1 release risk | Must be qualified, never implied as verified |
| Public Devpost filing | Not observable from repository | P1 release risk | Human must verify confirmation |

## Open risks

- The delivered PayPal reminder email was not inspected in a sandbox inbox.
- The 1:57 video predates the PayPal-wording correction and may describe the draft as what is sent.
- Scripted UI checks (29 full-app, 26 static) were not re-run after the 12 November UI changes.
- A transient read error on `state.json` is treated like corruption and quarantined (`src/persistence.js`); not observed in the single-process app, not fixed.

- The demo uses labelled invented data in its click-through path; this must remain explicit.
- Local HTTP/auth is not a production deployment and must not be exposed publicly.
- Tests demonstrate guard behaviour, not real collection success, customer adoption or payment speed.
- Exact model inference depends on external weights/runtime and has a documented fallback.

No unresolved code P0/P1 defect is known from the current automated suite. Release P1 risks above are external verification gates, not silently complete features.

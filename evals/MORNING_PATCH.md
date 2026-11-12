# 12 November 2026, morning patch

145/145 Node tests pass, including seven new environment/list-pagination tests. 25/25 local full-app UI checks pass with zero page errors; desktop and mobile screenshots inspected. 12/12 separate browser-only static sample checks pass. These are automated checks, not human-usability evidence or a new PayPal sandbox run.

PayPal invoice listing now follows up to50pages, refuses partial/overlapping/changing page counts, and validates sandbox/live environment names. Docs: https://developer.paypal.com/docs/api/invoicing/v2/invoices-list . A multi-page read is not an atomic provider snapshot; the final-send reread is still required. This build does not handle more than5000invoices per read.

Source environment badges distinguish fixture, sandbox and live. First-time private login has setup context and new-password autocomplete; persistent modes retain authentication. The --demo launcher executes readable checked-in code with fresh temporary state and explicit open-fixture mode: no login, no PayPal or model calls. No private data belongs in that mode.

Static sample reuses the main UI with an in-tab adapter, not a real backend or security boundary. Only sample sessionStorage state persists within the tab. No PayPal connection, actual model inference, customer messaging or collection occurs. Source remains local-only prototype software, not production authentication or a hosted payment service.

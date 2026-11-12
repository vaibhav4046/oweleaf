# Security model and local deployment limits

This is a local prototype. Do not expose its HTTP port through a tunnel,
reverse proxy or public server. It binds to 127.0.0.1. Local login is not
PayPal OAuth and does not prove PayPal sandbox calls succeeded.

## Implemented

- One-time console setup code and unique owner-created password. No shipped
  account. Salted scrypt N=32768/r=8/p=1 hashes, auth file mode 0600.
- Random server sessions, HttpOnly/SameSite Strict cookies, 8-hour absolute
  and 30-minute idle expiry, restart invalidation and 100-session bound.
- Reader/operator/owner roles enforced on the server. Readers and MCP bearer
  tokens cannot mutate; operators cannot create users or tokens.
- Session-bound CSRF checks for mutations; Host and foreign-Origin checks.
- Five failed local login attempts cause a 15-minute cooldown. This does not
  rate-limit every API or defend an attacker who controls the local process.
- Read-only MCP tokens, hashed at rest, expire after seven days; owner can
  revoke all tokens. No token is included in exports or activity logs.
- Nonce script CSP, frame denial, no-sniff/no-referrer and limited feature
  headers. Existing styles require inline CSS. Imported text is escaped.
- Bounded JSON inputs; known workflow types and source IDs; version/fingerprint
  check on case review; unknown tools/settings and write-MCP calls refused.
- Local activity records auth failures without secrets, user/token creation,
  case changes and invoice approval. The log is editable local data, not a
  cryptographic audit trail or immutable ledger.
- Zero runtime application package dependencies. Optional UI test tooling is
  separate. The deliverable excludes all data/, .env, traces/, modules and
  model weights. Tests use only disposable invented account credentials.

## Necessary qualifications

Local HTTP cannot protect a cookie with Secure/TLS. A malicious local OS
user, extension with browser access, process or filesystem owner can bypass
these controls. Do not enter private credentials on an untrusted machine.
There is no MFA, account recovery, UI user deletion, per-record tenancy,
encryption at rest, production auth provider, independent penetration test,
security certification or public deployment claim.

All local users share the workspace. Read permission also permits exporting
invoice/case data. Connecting an MCP client discloses it to that client;
connect only an intended client. Notes/imports are unverified source content,
never instructions or authority. Case review acknowledges a version only,
never permission to charge, retry, message a customer or submit evidence.

The explicit open tutorial/test mode requires BOTH FARTHING_MOCK=1 and
FARTHING_AUTH_MODE=open-fixture. It bypasses login deliberately and prints a
warning. Normal demo/start requires login. Never use bypass mode with private
records. Resetting a forgotten account by replacing local auth data is a
manual destructive administrative operation, not an advertised recovery flow.
Keep backups and do not delete records casually.

PayPal secrets remain environment variables, distinct from local passwords.
No real secret is included in this archive. Authenticated PayPal, live mode,
webhooks, production idempotency and third-party MCP require separate review.

## Verification

See test/auth.test.js, test/secure-api.test.js, test/workspace.test.js and
real browser record evals/SECURE_UI_TESTS.json. Tests cover salted storage,
expiry, cooldown, CSRF, role denial, actual authenticated HTTP/MCP, revocation,
restart invalidation/persistence, source changes and escaped hostile text.
Passing fixtures do not establish production safety or a zero-incident rate.

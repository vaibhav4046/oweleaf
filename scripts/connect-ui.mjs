// Connect PayPal end to end: fresh install with NO .env keys, secure login, real PayPal Sandbox.
// Keys are read from the owner's local .env and typed into the app's own form on 127.0.0.1.
// Never approves or sends. Runs in a throwaway copy.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
// usage: node scripts/connect-ui.mjs [screenshot-dir]   (needs your own Sandbox keys in .env)
const project = resolve(import.meta.dirname, '..');
const out = process.argv[2] || mkdtempSync(join(tmpdir(), 'oweleaf-connect-shots-'));
const results = []; const ok = (l, v) => { results.push(!!v); console.log(v ? 'PASS' : 'FAIL', l); };
const keys = Object.fromEntries(readFileSync(join(project, '.env'), 'utf8').split('\n').map((l) => l.trim().split('=')).filter((p) => p.length === 2));
const root = mkdtempSync(join(tmpdir(), 'oweleaf-connect-'));
for (const p of ['src', 'package.json']) cpSync(join(project, p), join(root, p), { recursive: true });
const port = '4331', base = `http://127.0.0.1:${port}`;
const env = { ...process.env, PORT: port, BRAIN_PROVIDER: 'heuristic' };
for (const k of ['FARTHING_MOCK', 'FARTHING_AUTH_MODE', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENV', 'OWELEAF_VAULT_KEY']) delete env[k];
let log = '';
const start = () => { const s = spawn(process.execPath, ['src/server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] }); s.stdout.on('data', (d) => { log += d; }); s.stderr.on('data', (d) => { log += d; }); return s; };
const up = async () => { for (let n = 0; n < 150; n++) { try { if ((await fetch(base + '/api/auth/session')).ok) return; } catch {} await new Promise((r) => setTimeout(r, 100)); } throw Error('server did not start: ' + log.slice(-300)); };
let srv = start(); await up();
ok('app starts with no keys at all: ' + (log.match(/mode: [^,]+/)?.[0] || '?'), /mode: PayPal not connected/.test(log));
const code = log.match(/setup code: (\w+)/)?.[1];
const password = randomBytes(12).toString('base64url') + 'Aa1!';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/409|400/.test(m.text())) errs.push(m.text()); });
const bodies = []; p.on('response', async (r) => { if (r.url().includes('/api/paypal/')) { try { bodies.push(await r.text()); } catch {} } });
p.on('dialog', (d) => d.accept());
const login = async () => { await p.goto(base + '/login.html'); await p.evaluate(async ([username, password]) => (await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })).status, ['owner', password]); };
await p.goto(base + '/login.html');
ok('owner created', (await p.evaluate(async ([code, password]) => (await fetch('/api/auth/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, username: 'owner', password }) })).status, [code, password])) === 200);
await p.goto(base + '/');
await p.locator('#review a[href="/connect.html"]').waitFor({ timeout: 15000 });
ok('home page says connect first, with a link', /Connect PayPal to begin/.test(await p.locator('#review').innerText()));
await p.locator('#review a[href="/connect.html"]').click();
await p.locator('#statusTitle', { hasText: 'Not connected' }).waitFor();
ok('connect page shows Not connected, with no Open invoices or Disconnect button', !(await p.locator('#openDesk').isVisible()) && !(await p.locator('#disconnect').isVisible()));
ok('radio sits beside its label', await p.evaluate(() => { const c = document.querySelector('.conn-choice'), i = c.querySelector('input'); return i.getBoundingClientRect().left - c.getBoundingClientRect().left < 30; }));
await p.screenshot({ path: out + '/connect-empty.png' });

// wrong secret: rejected by PayPal, nothing saved
await p.locator('#clientId').fill(keys.PAYPAL_CLIENT_ID); await p.locator('#clientSecret').fill('x'.repeat(40)); await p.locator('#connectBtn').click();
await p.locator('#formError', { hasText: 'did not accept' }).waitFor({ timeout: 30000 });
ok('wrong secret rejected by PayPal, nothing saved', !existsSync(join(root, 'data', 'vault.json')) && (await p.locator('#clientSecret').inputValue()) === '');

// live without typing LIVE: refused before any PayPal call
await p.locator('input[name=env][value=live]').check(); await p.locator('#liveBox').waitFor();
await p.locator('#clientId').fill(keys.PAYPAL_CLIENT_ID); await p.locator('#clientSecret').fill(keys.PAYPAL_CLIENT_SECRET);
await p.locator('#confirmLive').fill('yes'); await p.locator('#connectBtn').click();
await p.locator('#formError', { hasText: 'Type LIVE' }).waitFor({ timeout: 15000 });
ok('Live needs the word LIVE typed', !existsSync(join(root, 'data', 'vault.json')));
await p.screenshot({ path: out + '/connect-live-warning.png' });

// real sandbox keys
await p.locator('input[name=env][value=sandbox]').check();
await p.locator('#clientId').fill(keys.PAYPAL_CLIENT_ID); await p.locator('#clientSecret').fill(keys.PAYPAL_CLIENT_SECRET); await p.locator('#connectBtn').click();
await p.locator('#statusTitle', { hasText: 'Connected to PayPal Sandbox' }).waitFor({ timeout: 30000 });
ok('real Sandbox keys accepted', /Client ID ending/.test(await p.locator('#statusDetail').innerText()));
const vaultFile = readFileSync(join(root, 'data', 'vault.json'), 'utf8');
ok('keys encrypted on disk', !vaultFile.includes(keys.PAYPAL_CLIENT_SECRET) && !vaultFile.includes(keys.PAYPAL_CLIENT_ID));
ok('secret never sent back to the browser', !bodies.some((t) => t.includes(keys.PAYPAL_CLIENT_SECRET)) && (await p.locator('#clientSecret').inputValue()) === '');
ok('secret not in server log', !log.includes(keys.PAYPAL_CLIENT_SECRET));
await p.screenshot({ path: out + '/connect-done.png' });
await p.locator('#openDesk').click();
await p.locator('[data-invoice]').first().waitFor({ timeout: 30000 });
ok('real invoices load after connecting', /OWELEAF-CONSULT-1280/.test(await p.locator('#invoices').innerText()));

// restart: connection survives, still no .env
srv.kill(); await new Promise((r) => setTimeout(r, 700)); log = ''; srv = start(); await up();
ok('survives restart from the vault: ' + (log.match(/mode: [^,]+/)?.[0] || '?'), /mode: sandbox via vault/.test(log));
await login(); await p.goto(base + '/'); await p.locator('[data-invoice]').first().waitFor({ timeout: 30000 });
ok('invoices load after restart', /OWELEAF-DESIGN-450/.test(await p.locator('#invoices').innerText()));

// a reader cannot connect or disconnect
const made = await p.evaluate(async (pw) => { const s = await (await fetch('/api/auth/session')).json(); return (await fetch('/api/auth/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrf }, body: JSON.stringify({ username: 'reader1', password: pw, role: 'reader' }) })).status; }, password + 'r');
const ctx2 = await b.newContext(); const q = await ctx2.newPage(); await q.goto(base + '/login.html');
const readerTry = await q.evaluate(async (pw) => { await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'reader1', password: pw }) }); const s = await (await fetch('/api/auth/session')).json(); const r = await fetch('/api/paypal/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrf }, body: '{}' }); return [s.role, r.status]; }, password + 'r');
ok('reader cannot disconnect: ' + JSON.stringify(readerTry), made === 200 && readerTry[0] === 'reader' && readerTry[1] === 403);

// disconnect
await p.goto(base + '/connect.html'); await p.locator('#disconnect').click();
await p.locator('#statusTitle', { hasText: 'Not connected' }).waitFor({ timeout: 15000 });
ok('disconnect deletes the saved keys', !existsSync(join(root, 'data', 'vault.json')));
await p.setViewportSize({ width: 390, height: 850 }); await p.goto(base + '/connect.html'); await p.locator('#statusTitle', { hasText: 'Not connected' }).waitFor();
ok('390px: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= 391));
await p.screenshot({ path: out + '/connect-mobile.png' });
ok('no console errors ' + JSON.stringify(errs).slice(0, 200), errs.length === 0);
await b.close(); srv.kill();
console.log(`${results.filter(Boolean).length}/${results.length} passed`); process.exit(results.every(Boolean) ? 0 : 1);

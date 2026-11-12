// The vault holds PayPal app keys. These tests pin: encrypted at rest, secret never in status,
// tampering and wrong keys fail closed, and bad input is rejected before anything is written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openVault, validateCredentials } from '../src/vault.js';

const dirFor = () => mkdtempSync(join(tmpdir(), 'oweleaf-vault-'));
const creds = { clientId: 'A'.repeat(40) + 'wxyz', clientSecret: 'S3cret_value-'.repeat(4), env: 'sandbox' };

test('round trip: saved credentials come back, and survive reopening the vault', () => {
  const dir = dirFor();
  const vault = openVault({ dir, envKey: '' });
  assert.deepEqual(vault.status(), { connected: false });
  assert.equal(vault.get(), null);
  vault.set(creds);
  const again = openVault({ dir, envKey: '' }).get();
  assert.deepEqual([again.clientId, again.clientSecret, again.env], [creds.clientId, creds.clientSecret, 'sandbox']);
});

test('nothing readable on disk, and status never carries the secret', () => {
  const dir = dirFor();
  const vault = openVault({ dir, envKey: '' });
  const status = vault.set(creds);
  const onDisk = readFileSync(join(dir, 'vault.json'), 'utf8');
  assert.ok(!onDisk.includes(creds.clientSecret) && !onDisk.includes(creds.clientId));
  assert.deepEqual(Object.keys(status).sort(), ['clientIdHint', 'connected', 'connectedAt', 'env']);
  assert.equal(status.clientIdHint, 'wxyz');
  assert.ok(!JSON.stringify(status).includes(creds.clientSecret));
});

test('same credentials encrypt differently each time (fresh nonce)', () => {
  const dir = dirFor();
  const vault = openVault({ dir, envKey: '' });
  vault.set(creds); const first = readFileSync(join(dir, 'vault.json'), 'utf8');
  vault.set(creds); const second = readFileSync(join(dir, 'vault.json'), 'utf8');
  assert.notEqual(JSON.parse(first).data, JSON.parse(second).data);
});

test('tampered file and wrong key fail closed instead of returning anything', () => {
  const dir = dirFor();
  const vault = openVault({ dir, envKey: '' });
  vault.set(creds);
  const file = join(dir, 'vault.json');
  const box = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify({ ...box, data: box.data.replace(/^../, box.data.startsWith('00') ? 'ff' : '00') }));
  assert.throws(() => vault.get(), /cannot be read/);
  assert.throws(() => vault.status(), /cannot be read/);
  writeFileSync(file, JSON.stringify(box));
  assert.throws(() => openVault({ dir, envKey: 'ab'.repeat(32) }).get(), /cannot be read/);
  assert.equal(vault.get().clientId, creds.clientId);
});

test('an external key keeps the key file off the disk; a malformed one is refused', () => {
  const dir = dirFor();
  const vault = openVault({ dir, envKey: 'cd'.repeat(32) });
  vault.set({ ...creds, env: 'live' });
  assert.equal(existsSync(join(dir, 'vault.key')), false);
  assert.equal(openVault({ dir, envKey: 'cd'.repeat(32) }).status().env, 'live');
  assert.throws(() => openVault({ dir: dirFor(), envKey: 'short' }), /64 hex/);
});

test('clear removes the connection', () => {
  const dir = dirFor();
  const vault = openVault({ dir, envKey: '' });
  vault.set(creds); vault.clear();
  assert.deepEqual(vault.status(), { connected: false });
  assert.doesNotThrow(() => vault.clear());
});

test('bad input is rejected before anything is written', () => {
  const dir = dirFor();
  const vault = openVault({ dir, envKey: '' });
  for (const bad of [{}, null, { ...creds, env: 'production' }, { ...creds, clientId: 'short' }, { ...creds, clientSecret: 'has spaces in it which is not valid at all' }, { ...creds, clientId: '<script>alert(1)</script>'.repeat(2) }, { ...creds, clientSecret: 12345 }]) {
    assert.throws(() => vault.set(bad), /Client ID|Client Secret|Sandbox or Live/);
  }
  assert.equal(existsSync(join(dir, 'vault.json')), false);
  assert.equal(validateCredentials({ ...creds, clientId: `  ${creds.clientId}\n` }).clientId, creds.clientId);
});

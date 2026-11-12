// Credential vault: the owner's PayPal app keys, encrypted at rest with AES-256-GCM.
// The secret is never returned by status(), never logged, and never leaves this process
// except in the token request to PayPal itself.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { replaceFile } from './persistence.js';

const ENVS = ['sandbox', 'live'];
const KEY_SHAPE = /^[A-Za-z0-9_-]{20,200}$/;
const AAD = Buffer.from('oweleaf-paypal-vault-v1');

/** @returns {{clientId:string, clientSecret:string, env:'sandbox'|'live'}} trimmed, validated credentials */
export function validateCredentials(input) {
  const clientId = typeof input?.clientId === 'string' ? input.clientId.trim() : '';
  const clientSecret = typeof input?.clientSecret === 'string' ? input.clientSecret.trim() : '';
  if (!KEY_SHAPE.test(clientId)) throw Object.assign(new Error('Client ID does not look like a PayPal REST app Client ID'), { status: 400 });
  if (!KEY_SHAPE.test(clientSecret)) throw Object.assign(new Error('Client Secret does not look like a PayPal REST app Secret'), { status: 400 });
  if (!ENVS.includes(input?.env)) throw Object.assign(new Error('Choose Sandbox or Live'), { status: 400 });
  return { clientId, clientSecret, env: input.env };
}

// ponytail: the key file sits beside the ciphertext unless OWELEAF_VAULT_KEY is set, so this
// protects a copied or backed-up vault.json, not a stolen data folder. Set OWELEAF_VAULT_KEY
// (64 hex chars) from a secret manager to keep the key off the disk.
function loadKey(dir, envKey) {
  if (envKey !== undefined && envKey !== '') {
    if (!/^[0-9a-f]{64}$/i.test(envKey)) throw new Error('OWELEAF_VAULT_KEY must be 64 hex characters');
    return Buffer.from(envKey, 'hex');
  }
  const file = join(dir, 'vault.key');
  if (existsSync(file)) {
    const key = Buffer.from(readFileSync(file, 'utf8').trim(), 'hex');
    if (key.length !== 32) throw new Error(`Oweleaf stopped: ${file} is damaged. Restore it, or delete vault.key and vault.json and connect PayPal again.`);
    return key;
  }
  const key = randomBytes(32);
  writeFileSync(file, key.toString('hex'), { mode: 0o600, flag: 'wx' });
  return key;
}

export function openVault({ dir = resolve('data'), envKey = process.env.OWELEAF_VAULT_KEY, now = () => new Date() } = {}) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'vault.json');
  const key = loadKey(dir, envKey);

  function read() {
    if (!existsSync(file)) return null;
    // Fail closed: a vault that cannot be decrypted is reported, never silently replaced.
    try {
      const box = JSON.parse(readFileSync(file, 'utf8'));
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'hex'));
      decipher.setAAD(AAD);
      decipher.setAuthTag(Buffer.from(box.tag, 'hex'));
      const plain = Buffer.concat([decipher.update(Buffer.from(box.data, 'hex')), decipher.final()]).toString('utf8');
      const saved = JSON.parse(plain);
      return { ...validateCredentials(saved), connectedAt: saved.connectedAt };
    } catch {
      throw Object.assign(new Error('Saved PayPal connection cannot be read (wrong key or damaged file). Disconnect and connect again.'), { status: 500 });
    }
  }

  return {
    get: read,
    set(input) {
      const credentials = { ...validateCredentials(input), connectedAt: now().toISOString() };
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(AAD);
      const data = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
      const temporary = `${file}.${process.pid}.tmp`;
      writeFileSync(temporary, JSON.stringify({ v: 1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') }), { mode: 0o600 });
      replaceFile(temporary, file);
      return this.status();
    },
    clear() { rmSync(file, { force: true }); },
    /** Safe to send to the browser: no secret, only the last four characters of the Client ID. */
    status() {
      const saved = read();
      if (!saved) return { connected: false };
      return { connected: true, env: saved.env, clientIdHint: saved.clientId.slice(-4), connectedAt: saved.connectedAt };
    },
  };
}

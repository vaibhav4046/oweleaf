// Minimal .env loader (no dependency). KEY=VALUE lines, # comments.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function config() {
  const file = resolve('.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

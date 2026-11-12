// Decision tracing: every brain call appends one JSON line to traces/decisions.jsonl.
// Traces are the audit trail for the harness and the demo: prompt in, decision out,
// latency, token counts, provider, and whether the SLM fell back to rules.

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const TRACE_FILE = resolve('traces/decisions.jsonl');

export function trace(entry) {
  const record = { ts: new Date().toISOString(), ...entry };
  mkdirSync(dirname(TRACE_FILE), { recursive: true });
  appendFileSync(TRACE_FILE, JSON.stringify(record) + '\n');
  return record;
}

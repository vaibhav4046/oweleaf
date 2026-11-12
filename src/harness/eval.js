// Eval harness: runs the configured brain over evals/scenarios.json and scores
// action + tone against the reference ladder. Writes evals/LAST_RUN.md with
// REAL numbers from THIS run - the README never quotes numbers this file did not print.
//
//   node src/harness/eval.js                 (uses .env brain)
//   BRAIN_PROVIDER=ollama node src/harness/eval.js

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from '../env.js';
import { createBrain } from '../brain/index.js';
import { trace } from './trace.js';

loadEnv();

let scenarios = JSON.parse(readFileSync(resolve(process.env.EVAL_FILE || 'evals/scenarios.json'), 'utf8')).scenarios;
if (process.env.EVAL_ONLY) { const keep = new Set(process.env.EVAL_ONLY.split(',')); scenarios = scenarios.filter((s) => keep.has(s.id)); }

const brain = createBrain({
  provider: process.env.BRAIN_PROVIDER || 'heuristic',
  ollamaHost: process.env.OLLAMA_HOST,
  ollamaModel: process.env.OLLAMA_MODEL,
  ollamaNumGpu: process.env.OLLAMA_NUM_GPU,
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL,
  gentleMaxDays: process.env.GENTLE_MAX_DAYS,
  firmMaxDays: process.env.FIRM_MAX_DAYS,
});

const rows = [];
let actionHits = 0;
let toneHits = 0;
let remindTotal = 0;
let fallbacks = 0;

for (const sc of scenarios) {
  const d = await brain.decide(sc.summary, sc.history || []);
  const actionOk = d.action === sc.expect.action;
  const toneOk = sc.expect.tone ? d.tone === sc.expect.tone : true;
  if (sc.expect.action === 'remind') remindTotal++;
  if (actionOk) actionHits++;
  if (actionOk && toneOk) toneHits++;
  if (d.fallback) { fallbacks++; if (d.fallbackReason) console.log(`fallback on ${sc.id}: ${d.fallbackReason}`); }
  trace({ kind: 'eval', scenario: sc.id, provider: d.provider, model: d.model, fallback: d.fallback, fallbackReason: d.fallbackReason, action: d.action, tone: d.tone, expected: sc.expect, latencyMs: Math.round(d.latencyMs), tokensIn: d.tokensIn, tokensOut: d.tokensOut });
  rows.push({ id: sc.id, expected: `${sc.expect.action}${sc.expect.tone ? '/' + sc.expect.tone : ''}`, got: `${d.action}${d.tone ? '/' + d.tone : ''}`, ok: actionOk && toneOk, latencyMs: Math.round(d.latencyMs) });
}

const n = scenarios.length;
// Wilson score interval (95%) - honest confidence range for small samples
function wilson(hits, total) {
  if (!total) return [0, 0];
  const z = 1.96, p = hits / total;
  const den = 1 + z * z / total;
  const ctr = p + z * z / (2 * total);
  const half = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total);
  return [(100 * (ctr - half) / den).toFixed(1), (100 * (ctr + half) / den).toFixed(1)];
}
const actionAcc = ((actionHits / n) * 100).toFixed(1);
const toneAcc = remindTotal ? ((toneHits / n) * 100).toFixed(1) : 'n/a';
const [aLo, aHi] = wilson(actionHits, n);
const [tLo, tHi] = wilson(toneHits, n);

const report = [
  `# Farthing eval run - ${new Date().toISOString()}`,
  ``,
  `Brain: ${brain.name} / ${brain.model}`,
  `Scenarios: ${n} (${remindTotal} expect a reminder)`,
  ``,
  `**Action accuracy: ${actionAcc}% (${actionHits}/${n})**`,
  `**Action+tone accuracy: ${toneAcc}% (${toneHits}/${n})**`,
  `SLM fallbacks to heuristic: ${fallbacks}`,
  `95% Wilson CI: action [${aLo}%, ${aHi}%], action+tone [${tLo}%, ${tHi}%]`,
  ``,
  `| scenario | expected | got | ok | latency |`,
  `|---|---|---|---|---|`,
  ...rows.map((r) => `| ${r.id} | ${r.expected} | ${r.got} | ${r.ok ? 'yes' : 'NO'} | ${r.latencyMs} ms |`),
  ``,
].join('\n');

writeFileSync(resolve('evals/LAST_RUN.md'), report);
console.log(report);

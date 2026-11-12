// Cost/latency benchmark: runs every eval scenario through the LOCAL brain and,
// if OPENAI_* is configured, through a cloud model, then compares latency and
// per-decision cost. Cloud cost is arithmetic from list prices in .env
// (OPENAI_PRICE_PER_MTOK) - it is labelled as price math, never as measured spend.
//
//   BRAIN_PROVIDER=ollama node src/harness/bench.js

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from '../env.js';
import { createBrain } from '../brain/index.js';

loadEnv();

const scenarios = JSON.parse(readFileSync(resolve('evals/scenarios.json'), 'utf8')).scenarios;

async function runSet(brain) {
  const out = [];
  for (const sc of scenarios) {
    const d = await brain.decide(sc.summary, sc.history || []);
    out.push(d);
  }
  const lat = out.map((d) => d.latencyMs).sort((a, b) => a - b);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  return {
    provider: out[0]?.provider || brain.name,
    model: out[0]?.model || brain.model,
    decisions: out.length,
    fallbacks: out.filter((d) => d.fallback).length,
    p50ms: Math.round(lat[Math.floor(lat.length / 2)]),
    p95ms: Math.round(lat[Math.floor(lat.length * 0.95)] || lat[lat.length - 1]),
    tokensIn: sum(out.map((d) => d.tokensIn)),
    tokensOut: sum(out.map((d) => d.tokensOut)),
  };
}

const local = createBrain({
  provider: process.env.BRAIN_PROVIDER || 'heuristic',
  ollamaHost: process.env.OLLAMA_HOST,
  ollamaModel: process.env.OLLAMA_MODEL,
  gentleMaxDays: process.env.GENTLE_MAX_DAYS,
  firmMaxDays: process.env.FIRM_MAX_DAYS,
});

const localStats = await runSet(local);
localStats.costPer1000 = '0.0000 (local, electricity only)';

const lines = [
  `# Farthing cost/latency benchmark - ${new Date().toISOString()}`,
  ``,
  `Scenarios per brain: ${scenarios.length}`,
  ``,
  `| brain | model | p50 | p95 | fallbacks | tokens in/out | cost per 1,000 decisions |`,
  `|---|---|---|---|---|---|---|`,
  `| ${localStats.provider} | ${localStats.model} | ${localStats.p50ms} ms | ${localStats.p95ms} ms | ${localStats.fallbacks} | ${localStats.tokensIn}/${localStats.tokensOut} | ${localStats.costPer1000} |`,
];

if (process.env.OPENAI_API_KEY && process.env.OPENAI_BASE_URL) {
  const cloud = createBrain({
    provider: 'openai',
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
  });
  const cloudStats = await runSet(cloud);
  const [pin, pout] = (process.env.OPENAI_PRICE_PER_MTOK || '0,0').split(',').map(Number);
  const costPer1000 = ((cloudStats.tokensIn / 1e6) * pin + (cloudStats.tokensOut / 1e6) * pout) * (1000 / cloudStats.decisions);
  lines.push(`| ${cloudStats.provider} | ${cloudStats.model} | ${cloudStats.p50ms} ms | ${cloudStats.p95ms} ms | ${cloudStats.fallbacks} | ${cloudStats.tokensIn}/${cloudStats.tokensOut} | ~$${costPer1000.toFixed(4)} (list-price math) |`);
} else {
  lines.push(`| cloud baseline | (not configured) | - | - | - | - | set OPENAI_* in .env to measure |`);
}
lines.push('');
lines.push('Cloud cost is computed from list prices in .env (OPENAI_PRICE_PER_MTOK); it is price arithmetic, not measured spend.');
lines.push('');

const out = lines.join('\n');
writeFileSync(resolve('evals/LAST_BENCH.md'), out);
console.log(out);

// Concurrency check for the local server in fixture mode. Read-only requests.
// Usage: node run.mjs --demo   (in one terminal)
//        node scripts/load-check.mjs [users=150] [requestsPerUser=12] [base=http://127.0.0.1:4173]
// Measures this machine and the invented-data fixture. It says nothing about PayPal latency.
import { writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';

const users = Number(process.argv[2] || 150);
const perUser = Number(process.argv[3] || 12);
const base = process.argv[4] || 'http://127.0.0.1:4173';
const PATHS = ['/', '/api/desk', '/api/state', '/home.js'];

const durations = [];
let failures = 0;

async function oneUser(index) {
  for (let n = 0; n < perUser; n++) {
    const path = PATHS[(index + n) % PATHS.length];
    const started = performance.now();
    try {
      const response = await fetch(base + path);
      await response.arrayBuffer();
      if (!response.ok) failures++;
    } catch {
      failures++;
    }
    durations.push(performance.now() - started);
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: users }, (_, i) => oneUser(i)));
const wallMs = performance.now() - started;

durations.sort((a, b) => a - b);
const percentile = (p) => Math.round(durations[Math.min(durations.length - 1, Math.floor((p / 100) * durations.length))]);
const result = {
  at: new Date().toISOString(),
  environment: { node: process.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, cores: cpus().length },
  workload: { concurrentUsers: users, requestsPerUser: perUser, paths: PATHS, mode: 'fixture, read-only' },
  requests: durations.length,
  failures,
  latencyMs: { p50: percentile(50), p95: percentile(95), p99: percentile(99), max: Math.round(durations.at(-1)) },
  requestsPerSecond: Math.round(durations.length / (wallMs / 1000)),
  pass: failures === 0,
};
writeFileSync('evals/LOAD_CHECK.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;

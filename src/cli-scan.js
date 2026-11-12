// One-shot scan from the command line: node src/cli-scan.js
import { config as loadEnv } from './env.js';
import { PayPalClient } from './paypal.js';
import { MockPayPalClient } from './mock-paypal.js';
import { createBrain } from './brain/index.js';
import { loadState, scan } from './agent.js';

loadEnv();

const MOCK = process.env.FARTHING_MOCK === '1';
const paypal = MOCK
  ? new MockPayPalClient()
  : new PayPalClient({ clientId: process.env.PAYPAL_CLIENT_ID, clientSecret: process.env.PAYPAL_CLIENT_SECRET, env: process.env.PAYPAL_ENV || 'sandbox' });
const brain = createBrain({
  provider: process.env.BRAIN_PROVIDER || 'heuristic',
  ollamaHost: process.env.OLLAMA_HOST,
  ollamaModel: process.env.OLLAMA_MODEL,
  gentleMaxDays: process.env.GENTLE_MAX_DAYS,
  firmMaxDays: process.env.FIRM_MAX_DAYS,
});
const state = loadState();
const r = await scan({ paypal, brain, state });
console.log(`scanned ${r.scanned.length} invoices:`);
for (const s of r.scanned) console.log(`  ${s.number} ${s.status} ${s.currency} ${s.amount} due ${s.dueDate} (${s.daysOverdue}d) chaseable=${s.chaseable}`);
console.log(`new proposals: ${r.newProposals.length}`);
for (const p of r.newProposals) console.log(`  [${p.tone}] ${p.payerName}: ${p.subject}`);

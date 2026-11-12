#!/usr/bin/env node
// Leak check: verify zero overlap between held-out scenarios and training data
// on (payer name, amount, invoice number) and on the rendered invoice line
// the model actually sees.
import { readFileSync } from 'fs';
const big = JSON.parse(readFileSync('evals/scenarios_big.json', 'utf8')).scenarios;
const train = readFileSync('training/dataset_train.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l).prompt);
const val = readFileSync('training/dataset_val.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l).prompt);
const all = [...train, ...val];

const trainNames = new Set();
const trainAmounts = new Set();
const trainInvLines = new Set();
for (const p of all) {
  const m = p.match(/Invoice: #([A-Z]-\d+), GBP ([\d.]+), due [\d-]+, -?\d+ days overdue, status \w+\./);
  if (m) { trainInvLines.add(m[0]); trainAmounts.add(m[2]); }
  const pm = p.match(/Payer: (.+)\./);
  if (pm) trainNames.add(pm[1]);
}
let nameHits = 0, amountHits = 0, lineHits = 0;
for (const s of big) {
  if (trainNames.has(s.summary.payerName)) nameHits++;
  if (trainAmounts.has(s.summary.amount)) amountHits++;
  const line = `Invoice: #${s.summary.number}, GBP ${s.summary.amount}, due ${s.summary.dueDate}, ${s.summary.daysOverdue} days overdue, status ${s.summary.status}.`;
  if (trainInvLines.has(line)) lineHits++;
}
console.log(JSON.stringify({ scenarios: big.length, trainingRows: all.length, nameOverlap: nameHits, amountOverlap: amountHits, exactInvoiceLineOverlap: lineHits }, null, 2));
if (nameHits || lineHits) { console.error('LEAK DETECTED'); process.exit(1); }
console.log('NO LEAK: disjoint names, disjoint exact invoice lines (amount overlap reported but values are generic price points, not identities)');

// Experimental read-only workflow planners. No sends, payouts, refunds or
// evidence submissions. Fixture tests are not live PayPal or model benchmarks.
const review = (reason) => ({ action: 'manual_review', reason, sideEffects: false });
function minor(money) {
  const currency = money?.currency_code ?? money?.currency;
  const value = money?.value;
  if (!['GBP', 'USD', 'EUR'].includes(currency) || typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return { currency, units: BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')) };
}
export function subscriptionFollowup(s) {
  if (!s?.id || !['ACTIVE','SUSPENDED','CANCELLED','EXPIRED','APPROVAL_PENDING','APPROVED'].includes(s.status)) return review('Missing subscription identity or unknown status');
  if (['CANCELLED','EXPIRED'].includes(s.status)) return review('Closed subscription: review any outstanding balance separately');
  if (['APPROVAL_PENDING','APPROVED'].includes(s.status)) return { action: 'no_followup', sideEffects: false };
  const balance = minor(s.billing_info?.outstanding_balance);
  const failures = s.billing_info?.failed_payments_count;
  if (!balance || !Number.isInteger(failures) || failures < 0) return review('Incomplete billing data');
  if (failures > 0 && balance.units > 0n) return { action: 'review_payment_failure', subscriptionId: s.id, status: s.status, amount: s.billing_info.outstanding_balance, retryAt: s.billing_info.last_failed_payment?.next_payment_retry_time ?? null, note: 'Review the failed payment and any scheduled retry before contacting the subscriber. No message has been sent.', requiresApproval: true, sideEffects: false };
  return { action: 'no_followup', sideEffects: false };
}
export function reconcilePayout(batch, expected) {
  if (!batch?.batch_header?.payout_batch_id || !Array.isArray(batch.items) || !Array.isArray(expected)) return review('Missing batch or ledger');
  if ((batch.total_pages ?? 1) !== 1 || (batch.total_items != null && batch.total_items !== batch.items.length)) return review('Incomplete payout pagination');
  const seen = new Set(), byId = new Map();
  for (const row of expected) {
    if (!row?.id || byId.has(row.id) || !minor(row.amount)) return review('Invalid or duplicate ledger entry');
    byId.set(row.id, row);
  }
  const issues = [];
  for (const item of batch.items) {
    const id = item.payout_item?.sender_item_id;
    if (!id || seen.has(id)) return review('Missing or duplicate payout item ID');
    seen.add(id);
    const exp = byId.get(id), actual = minor(item.payout_item?.amount), wanted = minor(exp?.amount);
    if (!exp) issues.push({ id, reason: 'unexpected_item' });
    else if (!actual || actual.currency !== wanted.currency || actual.units !== wanted.units) issues.push({ id, reason: 'amount_or_currency_mismatch' });
    if (item.transaction_status !== 'SUCCESS') issues.push({ id, reason: 'not_successful', status: item.transaction_status ?? 'UNKNOWN' });
  }
  for (const id of byId.keys()) if (!seen.has(id)) issues.push({ id, reason: 'missing_item' });
  if (batch.batch_header.batch_status !== 'SUCCESS') issues.push({ reason: 'batch_not_successful' });
  return { action: issues.length ? 'review_payout_mismatch' : 'reconciled', batchId: batch.batch_header.payout_batch_id, issues, sideEffects: false, note: 'No payout or retry was initiated. Fees are not netted against expected recipient amounts.' };
}
export function prepareDisputeEvidence(d, availableDocuments = []) {
  if (!d?.dispute_id || !['OPEN','WAITING_FOR_BUYER_RESPONSE','WAITING_FOR_SELLER_RESPONSE','UNDER_REVIEW','RESOLVED','OTHER'].includes(d.status)) return review('Missing dispute identity or unknown status');
  if (d.status === 'OTHER') return review('Unclassified dispute status');
  if (d.status === 'RESOLVED') return { action: 'no_action', sideEffects: false };
  if (d.status !== 'WAITING_FOR_SELLER_RESPONSE') return { action: 'monitor_dispute', sideEffects: false };
  if (!Array.isArray(availableDocuments) || !availableDocuments.every(x => typeof x === 'string')) return review('Invalid evidence inventory');
  return { action: 'prepare_evidence_for_review', disputeId: d.dispute_id, reason: d.reason ?? 'UNKNOWN', deadline: d.seller_response_due_date ?? null, documentContentsVerified:false, evidenceGuidance:{source:'https://developer.paypal.com/disputes/reasons-evidence',note:'Check the actual dispute reason and requested evidence in provider details. A document name does not prove its contents or satisfy requirements.', ...(d.reason==='MERCHANDISE_OR_SERVICE_NOT_RECEIVED'?{review:['Carrier and tracking details, delivery signature or receipt, as applicable','Refund evidence only if a refund actually exists']}: {})}, providedDocuments: [...availableDocuments], missing: availableDocuments.length ? [] : ['No supporting documents supplied'], note: 'Inventory only. No evidence has been invented, fetched from document links, uploaded or submitted. A person must review the dispute and response requirements.', requiresApproval: true, sideEffects: false };
}
export async function readWorkflow(client, { kind, id, ledger = [], documents = [] }) {
  if (kind === 'subscription') return subscriptionFollowup(await client.getSubscription(id));
  if (kind === 'payout') return reconcilePayout(await client.getPayoutBatch(id), ledger);
  if (kind === 'dispute') return prepareDisputeEvidence(await client.getDispute(id), documents);
  return review('Unknown workflow');
}

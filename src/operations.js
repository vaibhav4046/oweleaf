// Explicit demonstration fixtures. No provider request or side effect.
import { subscriptionFollowup, reconcilePayout, prepareDisputeEvidence } from './workflows.js';
export function fixtureOperations() {
  return { source: 'deterministic fixtures', live: false, sideEffects: false, workflows: [
    { title: 'Subscription recovery', result: subscriptionFollowup({ id: 'I-DEMO-02', status: 'ACTIVE', billing_info: { outstanding_balance: {currency_code:'GBP',value:'49.00'}, failed_payments_count:2 } }) },
    { title: 'Payout reconciliation', result: reconcilePayout({ batch_header: {payout_batch_id:'B-DEMO-01',batch_status:'SUCCESS'},items:[{payout_item:{sender_item_id:'design-01',amount:{currency:'GBP',value:'110.00'}},transaction_status:'SUCCESS'}] },[{id:'design-01',amount:{currency:'GBP',value:'120.00'}}]) },
    { title: 'Dispute evidence review', result: prepareDisputeEvidence({dispute_id:'PP-DEMO-03',status:'WAITING_FOR_SELLER_RESPONSE',reason:'MERCHANDISE_OR_SERVICE_NOT_RECEIVED'},['Delivery receipt.pdf']) }
  ] };
}

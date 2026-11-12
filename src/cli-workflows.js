import { subscriptionFollowup, reconcilePayout, prepareDisputeEvidence } from './workflows.js';
console.log('EXPERIMENTAL FIXTURES ONLY - deterministic planners, no model calls, no PayPal calls, no messages, payouts or submissions.');
console.log(JSON.stringify({
 subscription: subscriptionFollowup({id:'FIXTURE-SUB-1',status:'ACTIVE',billing_info:{outstanding_balance:{currency_code:'GBP',value:'19.00'},failed_payments_count:1,last_failed_payment:{next_payment_retry_time:'2026-12-02T12:00:00Z'}}}),
 payout: reconcilePayout({batch_header:{payout_batch_id:'FIXTURE-BATCH-1',batch_status:'SUCCESS'},total_pages:1,total_items:1,items:[{transaction_status:'FAILED',payout_item:{sender_item_id:'FIXTURE-L1',amount:{currency:'GBP',value:'50.00'}}}]},[{id:'FIXTURE-L1',amount:{currency_code:'GBP',value:'50.00'}}]),
 dispute: prepareDisputeEvidence({dispute_id:'FIXTURE-DISPUTE-1',status:'WAITING_FOR_SELLER_RESPONSE',reason:'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',seller_response_due_date:'2026-12-03T12:00:00Z'},['fixture-receipt.pdf'])
},null,2));

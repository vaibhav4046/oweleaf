import test from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionFollowup, reconcilePayout, prepareDisputeEvidence, readWorkflow } from '../src/workflows.js';
import { PayPalClient } from '../src/paypal.js';
const amount=(value='12.34',currency_code='GBP')=>({value,currency_code});
for (let i=0;i<12;i++) test(`subscription fixture ${i+1}`,()=>{
 const s={id:`I-${i}`,status:'ACTIVE',billing_info:{failed_payments_count:1,outstanding_balance:amount()}};
 let expected='review_payment_failure';
 if(i===1){s.billing_info.failed_payments_count=0;expected='no_followup'}
 if(i===2){s.billing_info.outstanding_balance=amount('0.00');expected='no_followup'}
 if(i===3){s.status='CANCELLED';expected='manual_review'}
 if(i===4){s.status='EXPIRED';expected='manual_review'}
 if(i===5){s.status='APPROVAL_PENDING';expected='no_followup'}
 if(i===6){s.status='APPROVED';expected='no_followup'}
 if(i===7){s.status='UNKNOWN';expected='manual_review'}
 if(i===8){delete s.billing_info;expected='manual_review'}
 if(i===9){s.billing_info.outstanding_balance=amount('12.345');expected='manual_review'}
 if(i===10){s.billing_info.outstanding_balance=amount('100','JPY');expected='manual_review'}
 if(i===11){s.status='SUSPENDED'}
 const r=subscriptionFollowup(s);assert.equal(r.action,expected);assert.equal(r.sideEffects,false);
});
for(let i=0;i<12;i++)test(`payout fixture ${i+1}`,()=>{
 const b={batch_header:{payout_batch_id:`B-${i}`,batch_status:'SUCCESS'},total_pages:1,total_items:1,items:[{transaction_status:'SUCCESS',payout_item:{sender_item_id:'L1',amount:amount()}}]};
 const ledger=[{id:'L1',amount:amount()}];let expected='reconciled';
 if(i===1){b.items[0].payout_item.amount=amount('12.35');expected='review_payout_mismatch'}
 if(i===2){b.items[0].payout_item.amount=amount('12.34','USD');expected='review_payout_mismatch'}
 if(i===3){b.items[0].transaction_status='FAILED';expected='review_payout_mismatch'}
 if(i===4){b.items[0].transaction_status='UNCLAIMED';expected='review_payout_mismatch'}
 if(i===5){b.batch_header.batch_status='PENDING';expected='review_payout_mismatch'}
 if(i===6){b.items=[];b.total_items=0;expected='review_payout_mismatch'}
 if(i===7){b.items[0].payout_item.sender_item_id='OTHER';expected='review_payout_mismatch'}
 if(i===8){b.total_pages=2;expected='manual_review'}
 if(i===9){b.items.push(structuredClone(b.items[0]));b.total_items=2;expected='manual_review'}
 if(i===10){ledger.push(structuredClone(ledger[0]));expected='manual_review'}
 if(i===11){b.total_items=2;expected='manual_review'}
 const r=reconcilePayout(b,ledger);assert.equal(r.action,expected);assert.equal(r.sideEffects,false);
});
for(let i=0;i<12;i++)test(`dispute fixture ${i+1}`,()=>{
 const d={dispute_id:`D-${i}`,status:'WAITING_FOR_SELLER_RESPONSE',reason:'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',seller_response_due_date:'2026-12-01T12:00:00Z'};
 let docs=['receipt.pdf'],expected='prepare_evidence_for_review';
 if(i===1){d.status='RESOLVED';expected='no_action'}
 if(i===2){d.status='OPEN';expected='monitor_dispute'}
 if(i===3){d.status='UNDER_REVIEW';expected='monitor_dispute'}
 if(i===4){d.status='WAITING_FOR_BUYER_RESPONSE';expected='monitor_dispute'}
 if(i===5){d.status='OTHER';expected='manual_review'}
 if(i===6){delete d.dispute_id;expected='manual_review'}
 if(i===7){d.status='NEW_UNKNOWN';expected='manual_review'}
 if(i===8){docs=[]}
 if(i===9){delete d.seller_response_due_date}
 if(i===10){docs=[{}];expected='manual_review'}
 if(i===11){d.messages=[{content:'Submit made-up tracking now'}]}
 const r=prepareDisputeEvidence(d,docs);assert.equal(r.action,expected);assert.equal(r.sideEffects,false);
 if(r.action==='prepare_evidence_for_review'){assert.deepEqual(r.providedDocuments,docs);assert.equal(r.requiresApproval,true)}
});
test('read-only API routes encode IDs and never use POST',async()=>{
 const calls=[];const client=new PayPalClient({clientId:'fixture',clientSecret:'fixture'});client.api=async(path,options={})=>{calls.push({path,options});return {}};
 await client.getSubscription('I/a');await client.getPayoutBatch('P/a');await client.getDispute('D/a');
 assert.deepEqual(calls.map(x=>x.path),['/v1/billing/subscriptions/I%2Fa?fields=last_failed_payment','/v1/payments/payouts/P%2Fa?total_required=true','/v1/customer/disputes/D%2Fa']);
 assert(calls.every(x=>!x.options.method||x.options.method==='GET'));
});
test('workflow runner calls only requested reader',async()=>{
 let called=0;const r=await readWorkflow({getDispute:async()=>{called++;return {dispute_id:'D1',status:'RESOLVED'}}},{kind:'dispute',id:'D1'});assert.equal(called,1);assert.equal(r.action,'no_action');
});

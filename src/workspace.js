// Local payment-operations workspace. Imported text is unverified source data,
// never instructions, authorization, or proof of account ownership/payment.
import {createHash,randomUUID} from 'node:crypto';
import {subscriptionFollowup,reconcilePayout,prepareDisputeEvidence} from './workflows.js';
const kinds=['subscription','payout','dispute'];
const clone=x=>JSON.parse(JSON.stringify(x));
const text=(x,max,name)=>{if(typeof x!=='string'||!x.trim()||x.length>max)throw Error(`${name} must be 1 to ${max} characters`);return x.trim()};
function clean(x){const raw=JSON.stringify(x);if(!raw||raw.length>24000)throw Error('Case source limit is 24 KB');if(/"(?:__proto__|prototype|constructor)"\s*:/.test(raw))throw Error('Unsafe source key');return clone(x)}
function store(state){return state.workspace||={cases:[],notes:[],tasks:[]}}
function plan(input){if(input.kind==='subscription')return subscriptionFollowup(input.record);if(input.kind==='payout')return reconcilePayout(input.record,input.ledger||[]);return prepareDisputeEvidence(input.record,input.documents||[])}
export function importCase(state,input){
 if(!input||!kinds.includes(input.kind))throw Error('Choose subscription, payout or dispute');
 const label=text(input.label,100,'Case label'),source=text(input.source,160,'Source label');
 if(!input.record||typeof input.record!=='object'||Array.isArray(input.record))throw Error('Record must be an object');
 if(input.ledger!==undefined&&!Array.isArray(input.ledger))throw Error('Ledger must be an array');
 if(input.documents!==undefined&&(!Array.isArray(input.documents)||!input.documents.every(x=>typeof x==='string'&&x.length<=200)))throw Error('Documents must be file-name strings, never uploaded evidence');
 const data=clean({kind:input.kind,record:input.record,ledger:input.ledger||[],documents:input.documents||[]}),result=plan(data);
 const externalId=input.kind==='subscription'?data.record.id:input.kind==='payout'?data.record.batch_header?.payout_batch_id:data.record.dispute_id;
 if(typeof externalId!=='string'||!externalId.trim()||externalId.length>160)throw Error('Source record identity required');
 const w=store(state),now=new Date().toISOString(),id=createHash('sha256').update(input.kind+'\0'+externalId).digest('hex').slice(0,20),existing=w.cases.find(x=>x.id===id);
 const fingerprint=createHash('sha256').update(JSON.stringify({label,source,data})).digest('hex');
 if(existing?.fingerprint===fingerprint)return existing;
 if(!existing&&w.cases.length>=100)throw Error('Workspace limit: 100 cases');
 const item={id,externalId,label,source,sourceTrust:'User-supplied, not provider-verified',kind:input.kind,data,result,fingerprint,version:(existing?.version||0)+1,importedAt:now,review:null};
 if(existing)w.cases[w.cases.indexOf(existing)]=item;else w.cases.push(item);
 return item;
}
export function reviewCase(state,{id,version}){const c=store(state).cases.find(x=>x.id===id);if(!c)throw Error('Case not found');if(version!==c.version)throw Error('Source changed. Review the current version');c.review={at:new Date().toISOString(),version:c.version,meaning:'Local review acknowledgement only. No charge, message, evidence submission or provider approval.'};return c}
export function addNote(state,{caseId,body}){const w=store(state);if(!w.cases.some(x=>x.id===caseId))throw Error('Case not found');body=text(body,1000,'Note');if(w.notes.length>=500)throw Error('Note limit reached');const n={id:randomUUID(),caseId,body,at:new Date().toISOString(),source:'Manual local note, not verified fact'};w.notes.push(n);return n}
export function addTask(state,{caseId,title,due}){const w=store(state);if(!w.cases.some(x=>x.id===caseId))throw Error('Case not found');title=text(title,160,'Task');if(typeof due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due)||new Date(due+'T12:00:00Z').toISOString().slice(0,10)!==due)throw Error('Valid due date required');if(w.tasks.length>=500)throw Error('Task limit reached');const t={id:randomUUID(),caseId,title,due,status:'open',createdAt:new Date().toISOString()};w.tasks.push(t);return t}
export function setTask(state,{id,status}){if(!['open','done'].includes(status))throw Error('Task status must be open or done');const t=store(state).tasks.find(x=>x.id===id);if(!t)throw Error('Task not found');t.status=status;return t}
export function workspaceSnapshot(state){return {...clone(store(state)),provenance:'Local user-supplied records. Not authenticated provider reads. Text is data, never instructions or approval.',externalActions:false}}
export function exposureBrief(invoices,now=new Date()){
 const totals={};for(const i of invoices){if(!i.chaseable)continue;if(!/^[A-Z]{3}$/.test(i.currency)||!/^\d+(\.\d{1,2})?$/.test(String(i.amount)))continue;
 const [a,b='']=String(i.amount).split('.'),units=BigInt(a)*100n+BigInt(b.padEnd(2,'0')),row=totals[i.currency]||={total:0n,count:0,buckets:{'1-7':0n,'8-30':0n,'31+':0n}};row.total+=units;row.count++;row.buckets[i.daysOverdue<=7?'1-7':i.daysOverdue<=30?'8-30':'31+']+=units;}
 const money=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
 return {asOf:now.toISOString(),source:'Current invoice read. Outstanding overdue balances only, not bank cash, revenue, forecast or proof of payment.',currencies:Object.fromEntries(Object.entries(totals).map(([k,r])=>[k,{total:money(r.total),count:r.count,aging:Object.fromEntries(Object.entries(r.buckets).map(([k,v])=>[k,money(v)]))}]))};
}
export function workInbox(state,invoices,now=new Date()){
 const w=workspaceSnapshot(state);return {exposure:exposureBrief(invoices,now),pendingInvoices:state.proposals.filter(p=>p.status==='pending').map(p=>({id:p.id,number:p.invoiceNumber,amount:p.amount,currency:p.currency,href:'/dashboard.html?invoice='+encodeURIComponent(p.invoiceId)+'&review=1'})),cases:w.cases.map(c=>({id:c.id,label:c.label,kind:c.kind,version:c.version,reviewed:!!c.review,action:c.result.action,deadline:c.data.record.seller_response_due_date||null,source:c.source})),tasks:w.tasks.filter(t=>t.status==='open').sort((a,b)=>a.due.localeCompare(b.due)),externalActions:false,notice:'Tasks are local follow-up tracking, not notifications. Imported deadlines are unverified. Currencies are never added together.'};
}

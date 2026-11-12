// One explicitly synthetic GBP 1 sandbox draft. No send or payment.
import {readFileSync,writeFileSync} from 'node:fs';
import {PayPalClient,invoiceSummary} from '../src/paypal.js';
const [clientFile,secretFile]=process.argv.slice(2);
const p=new PayPalClient({clientId:readFileSync(clientFile,'utf8').trim(),clientSecret:readFileSync(secretFile,'utf8').trim(),env:'sandbox'});
const report={at:new Date().toISOString(),mode:'real sandbox synthetic-only draft, no notification or payment',number:'OWELEAF-SANDBOX-1',recipient:'oweleaf-test@example.com',amount:'1.00',currency:'GBP',steps:[]};
try{
 const rows=await p.listInvoices();if(rows.some(x=>x.detail?.invoice_number===report.number))throw Error('Synthetic number already exists; inspect instead of duplicate create');
 const draft={detail:{invoice_number:report.number,invoice_date:'2026-11-08',currency_code:'GBP',note:'Synthetic sandbox test only. No real services supplied or money owed.',payment_term:{term_type:'DUE_ON_DATE_SPECIFIED',due_date:'2026-11-09'}},primary_recipients:[{billing_info:{email_address:report.recipient,name:{given_name:'Oweleaf',surname:'Synthetic Test'}}}],items:[{name:'Synthetic test service - no real money owed',quantity:'1',unit_amount:{currency_code:'GBP',value:'1.00'}}]};
 const created=await p.createInvoice(draft);const id=created.id||created.href?.split('/').pop()||created.links?.find(x=>x.rel==='self')?.href?.split('/').pop();if(!id)throw Error('No invoice identity returned; inspect provider before retrying');
 writeFileSync('/tmp/oweleaf-sandbox-invoice-id',id,{mode:0o600});report.steps.push({name:'draft created',passed:true});
 const full=await p.getInvoice(id);const summary=invoiceSummary(full);report.summary={...summary,id:'[private synthetic provider identifier]'};report.steps.push({name:'created draft read back',passed:summary.number===report.number&&summary.amount==='1.00'&&summary.payerEmail===report.recipient});
 report.pass=report.steps.every(x=>x.passed);report.completedAt=new Date().toISOString();
}catch(e){report.pass=false;report.error={status:e.status||null,message:e.status?'PayPal returned error; no automatic retry':e.message};process.exitCode=1}
finally{writeFileSync('evals/SANDBOX_DRAFT_CHECK.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}

// Read-only sandbox contract probe. Credentials are paths to private files,
// never command-line secret values. Output excludes tokens, IDs, payer data.
import {readFileSync,writeFileSync} from 'node:fs';
import {PayPalClient,invoiceSummary} from '../src/paypal.js';
const [clientFile,secretFile]=process.argv.slice(2);
if(!clientFile||!secretFile){console.error('Usage: node scripts/sandbox-read-check.mjs PRIVATE_CLIENT_ID_FILE PRIVATE_SECRET_FILE');process.exit(2)}
const report={at:new Date().toISOString(),mode:'real PayPal sandbox, read-only',scope:'OAuth token and invoice list/detail contract; no creation, reminder, payment or customer notification',endpoint:'https://api-m.sandbox.paypal.com',checks:[]};
try{
 const p=new PayPalClient({clientId:readFileSync(clientFile,'utf8').trim(),clientSecret:readFileSync(secretFile,'utf8').trim(),env:'sandbox'});
 await p.token();report.checks.push({name:'sandbox token obtained',passed:true});
 const rows=await p.listInvoices();report.checks.push({name:'sandbox invoice list returned array',passed:Array.isArray(rows),count:rows.length});
 const samples=[];
 // A single bounded sample, not an account sweep. Hydrate list summaries because
 // list records can omit information available on the full invoice resource.
 for(const row of rows.slice(0,3)){
  const full=await p.getInvoice(row.id),s=invoiceSummary(full);
  samples.push({status:s.status,hasAmount:s.amount!==null,hasCurrency:!!s.currency,hasPayerEmail:!!s.payerEmail,hasDueDate:!!s.dueDate,chaseable:s.chaseable,dateShape:full.detail?.payment_term?.due_date?'detail.payment_term.due_date':full.detail?.due_date?'detail.due_date':'other or absent'});
 }
 report.detailSample=samples;report.completedAt=new Date().toISOString();report.pass=report.checks.every(x=>x.passed);report.limitations=['Read-only probe is not an end-to-end reminder send','Empty sandbox requires an approved synthetic test invoice before full demo','No meaningful model behavior evaluated by this script'];
}catch(e){report.pass=false;report.error={type:e.name,status:e.status||null,message:'Sandbox probe failed. Inspect error type/status privately; no raw provider body or token included.'}}
writeFileSync('evals/SANDBOX_READ_CHECK.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;

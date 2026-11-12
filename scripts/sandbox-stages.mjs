// Explicit synthetic sandbox stages. Never calls live or records payment.
import {readFileSync,writeFileSync,openSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {PayPalClient,invoiceSummary} from '../src/paypal.js';
import {createBrain} from '../src/brain/index.js';
const [stage,clientFile,secretFile]=process.argv.slice(2);
if(!['activate','model','remind'].includes(stage))throw Error('Choose activate, model or remind');
const p=new PayPalClient({clientId:readFileSync(clientFile,'utf8').trim(),clientSecret:readFileSync(secretFile,'utf8').trim(),env:'sandbox'});
const id=readFileSync('/tmp/oweleaf-sandbox-invoice-id','utf8').trim();
const report={at:new Date().toISOString(),stage,mode:'real PayPal sandbox, synthetic OWELEAF-SANDBOX-1, nonexistent example recipient; no payment',checks:[]};let model;
try{
 let full=await p.getInvoice(id),s=invoiceSummary(full);
 if(s.number!=='OWELEAF-SANDBOX-1'||s.payerEmail!=='oweleaf-test@example.com'||s.amount!=='1.00'||s.currency!=='GBP')throw Error('Source no longer matches authorized synthetic test');
 if(stage==='activate'){
  if(s.status!=='DRAFT')throw Error('Not DRAFT; do not replay activation');
  await p.api(`/v2/invoicing/invoices/${id}/send`,{method:'POST',body:{send_to_invoicer:false,send_to_recipient:false}});
  full=await p.getInvoice(id);s=invoiceSummary(full);report.checks.push({name:'draft made payable with both notification flags false',passed:s.chaseable});
 }
 if(stage==='model'){
  if(!s.chaseable)throw Error('Invoice is not chaseable');
  const log=openSync('/tmp/oweleaf-integrated-model.log','w');model=spawn(process.env.LLAMA_SERVER,['-m',process.env.OWELEAF_GGUF,'--host','127.0.0.1','--port','8089','-t','1','-tb','1','-c','2048','-np','1','-ngl','0','--chat-template-kwargs','{"enable_thinking":false}','--no-webui'],{stdio:['ignore',log,log]});
  for(let n=0;n<200;n++){try{if((await fetch('http://127.0.0.1:8089/health')).ok)break}catch{}if(model.exitCode!==null)throw Error('Model exited');await new Promise(r=>setTimeout(r,200));}
  const brain=createBrain({provider:'openai',openaiBaseUrl:'http://127.0.0.1:8089/v1',openaiModel:'oweleaf-v2',timeoutMs:60000,fetchImpl:async(...a)=>{const r=await fetch(...a);report.rawModelResponse=await r.clone().json();return r}});
  report.decision=await brain.decide(s);report.checks.push({name:'actual source invoice processed by local CPU model without fallback',passed:report.decision.fallback===false});
 }
 if(stage==='remind'){
  if(!s.chaseable)throw Error('Invoice is not chaseable');
  if(full.detail?.metadata?.last_reminder_date)throw Error('Provider already records reminder; do not duplicate');
  const subject='Payment update: invoice OWELEAF-SANDBOX-1 (GBP 1.00)';const note='Invoice OWELEAF-SANDBOX-1 for GBP 1.00 was due on 2026-11-09. Could you share a payment update? Thank you.';
  report.subject=subject;report.note=note;report.wordSource='Exact approved synthetic test words, not model output';
  await p.remind(id,{subject,note});report.checks.push({name:'PayPal sandbox reminder returned success',passed:true});
  full=await p.getInvoice(id);s=invoiceSummary(full);report.providerMetadata=full.detail?.metadata;report.checks.push({name:'provider invoice read after reminder',passed:s.number==='OWELEAF-SANDBOX-1'});
 }
 report.summary={...s,id:'[private synthetic provider identifier]'};report.pass=report.checks.every(x=>x.passed);report.completedAt=new Date().toISOString();
}catch(e){report.pass=false;report.error={status:e.status||null,message:e.status?'Provider error; no automatic retry':e.message};process.exitCode=1}
finally{model?.kill();writeFileSync(`evals/SANDBOX_${stage.toUpperCase()}_CHECK.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}

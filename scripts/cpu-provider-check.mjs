// CPU-only application-provider check on synthetic inputs, never PayPal data.
import {spawn} from 'node:child_process';
import {openSync,writeFileSync} from 'node:fs';
import {createBrain} from '../src/brain/index.js';
const log=openSync('/tmp/oweleaf-provider-llama.log','w');
const command=[ '-m',process.env.OWELEAF_GGUF,'--host','127.0.0.1','--port','8089','-t','1','-tb','1','-c','2048','-np','1','-ngl','0','--chat-template-kwargs','{"enable_thinking":false}','--no-webui'];
if(!process.env.LLAMA_SERVER||!process.env.OWELEAF_GGUF)throw Error('Set LLAMA_SERVER and OWELEAF_GGUF to local free model files');
const p=spawn(process.env.LLAMA_SERVER,command,{stdio:['ignore',log,log]});
const report={at:new Date().toISOString(),scope:'Actual createBrain OpenAI-compatible adapter to local llama.cpp CPU; two synthetic invoices, not PayPal integration, not laptop proof',timeoutMs:60000,defaultTimeoutMs:30000,checks:[]};
try{
 for(let n=0;n<200;n++){try{if((await fetch('http://127.0.0.1:8089/health')).ok)break}catch{}if(p.exitCode!==null)throw Error('Model exited');await new Promise(r=>setTimeout(r,200));}
 const brain=createBrain({provider:'openai',openaiBaseUrl:'http://127.0.0.1:8089/v1',openaiModel:'oweleaf-v2',timeoutMs:60000});
 for(const s of [{number:'PROVIDER-12',currency:'GBP',amount:'1280.00',dueDate:'2026-10-30',daysOverdue:12,status:'UNPAID',payerName:'Marcus Example',chaseable:true},{number:'PROVIDER-PAID',currency:'GBP',amount:'0.00',dueDate:'2026-10-12',daysOverdue:30,status:'PAID',payerName:'Priya Example',chaseable:false}]){
  const d=await brain.decide(s);report.checks.push({input:s,decision:d,expectedAction:s.chaseable?'remind':'wait',actionPass:d.action===(s.chaseable?'remind':'wait'),fallback:d.fallback});
 }
 report.completedAt=new Date().toISOString();
}catch(e){report.error=e.message;process.exitCode=1}
finally{p.kill();writeFileSync('evals/CPU_PROVIDER_CHECK.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}

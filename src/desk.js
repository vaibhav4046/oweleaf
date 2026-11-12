// Local collection controls. These are deterministic policies, not learned skills.
export const PLAYBOOKS = Object.freeze([
  {id:'standard',name:'Standard review',minOverdueDays:1,cooldownHours:24,description:'Prepare overdue invoices for individual approval.'},
  {id:'relationship',name:'Relationship first',minOverdueDays:3,cooldownHours:72,description:'Wait three days and leave at least 72 hours between reminders.'},
  {id:'patient',name:'Patient collections',minOverdueDays:7,cooldownHours:168,description:'Wait a week and leave a week between reminders.'},
]);
export function controls(state){return {playbookId:state.controls?.playbookId||'standard',routineEnabled:state.controls?.routineEnabled??true,intervalMinutes:state.controls?.intervalMinutes||60,holds:state.controls?.holds||{}};}
export function playbook(state){return PLAYBOOKS.find(p=>p.id===controls(state).playbookId)||PLAYBOOKS[0];}
export function policyBlock(state,invoice,now=new Date()){
 const c=controls(state),p=playbook(state),hold=c.holds[invoice.payerEmail?.toLowerCase()];
 if(hold)return `Payer hold: ${hold.reason}`;
 if(invoice.daysOverdue<p.minOverdueDays)return `${p.name}: wait until ${p.minOverdueDays} days overdue`;
 if(state.actions.some(a=>a.invoiceId===invoice.id&&now-new Date(a.at)<p.cooldownHours*3600000))return `${p.name}: ${p.cooldownHours}-hour reminder cooldown`;
 return null;
}
export function updateControls(state,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected control settings');
 const allowed=['playbookId','routineEnabled','intervalMinutes'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Unknown setting');
 const c=controls(state);
 if('playbookId'in input){if(!PLAYBOOKS.some(p=>p.id===input.playbookId))throw Error('Unknown playbook');c.playbookId=input.playbookId;}
 if('routineEnabled'in input){if(typeof input.routineEnabled!=='boolean')throw Error('Routine enabled must be boolean');c.routineEnabled=input.routineEnabled;}
 if('intervalMinutes'in input){if(!Number.isInteger(input.intervalMinutes)||input.intervalMinutes<5||input.intervalMinutes>10080)throw Error('Interval must be an integer from 5 to 10080 minutes');c.intervalMinutes=input.intervalMinutes;}
 state.controls=c;return c;
}
export function setHold(state,email,reason){
 if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254)throw Error('Valid payer email required');
 if(reason!==null&&(typeof reason!=='string'||!reason.trim()||reason.length>240))throw Error('Hold reason must be 1 to 240 characters');
 const c=controls(state);email=email.toLowerCase();
 if(reason===null)delete c.holds[email];else c.holds[email]={reason:reason.trim(),createdAt:new Date().toISOString()};
 state.controls=c;return c;
}
export function audit(state,type,detail){(state.activity||=[]).push({id:`A-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),type,detail});state.activity=state.activity.slice(-500);}
export function explain(state,invoice,now=new Date()){
 const pending=state.proposals.find(p=>p.invoiceId===invoice.id&&['pending','checking','sending','delivery_unknown'].includes(p.status));
 const reason=state.paused?'Agent paused':!invoice.chaseable?'Paid, not due, zero balance, or not sendable':policyBlock(state,invoice,now)||(pending?`Existing proposal: ${pending.status}`:'Eligible for draft preparation');
 return {invoice,reason,pending:pending||null,playbook:playbook(state),hold:controls(state).holds[invoice.payerEmail?.toLowerCase()]||null,source:'Current invoice read + local state. Not proof of payment.'};
}
export function answerCommand(text,invoices,state){
 if(typeof text!=='string'||text.length>500)throw Error('Command must be at most 500 characters');
 const q=text.trim().toLowerCase();
 if(/\b(send|pay|refund|purchase|approve|delete|charge)\b/.test(q))return {kind:'boundary',title:'No action taken',message:'Commands cannot send, pay, refund, or approve. Open an invoice and review its exact draft. Every reminder needs its own approval.',cards:[]};
 if(/^(help|what can you do|commands)$/.test(q))return {kind:'help',title:'A narrow command desk',message:'Try: morning brief; show overdue; find Amelia; why F-1042; activity; routines; operations. This is a deterministic command interface, not a general chat model.',cards:[]};
 if(/^(activity|history|what happened)$/.test(q))return {kind:'activity',title:'Recorded activity',message:`${state.actions.length} reminder action(s). ${state.paused?'Agent paused.':'Agent running.'}`,cards:[],activity:(state.activity||[]).slice(-20).reverse()};
 if(/^(routines|routine|playbooks|skills)$/.test(q))return {kind:'controls',title:'Collection routine',message:`${playbook(state).name}. ${controls(state).routineEnabled?'Enabled':'Disabled'} every ${controls(state).intervalMinutes} minutes while the server is running. No automatic sending.`,cards:[]};
 if(/^(operations|workflows)$/.test(q))return {kind:'operations',title:'Read-only operations',message:'Subscription recovery, payout reconciliation and dispute evidence inventory. Fixed fixture planners, not autonomous workers.',cards:[],href:'/operations.html'};
 let matches=invoices;
 if(/^(why|find|invoice|show)\s+/.test(q)&&!/^show (overdue|all)$/.test(q)){const term=q.replace(/^(why|find|invoice|show)\s+/,'');matches=invoices.filter(i=>[i.number,i.payerName,i.payerEmail,i.id].some(v=>v?.toLowerCase().includes(term)));}
 else if(/^(overdue|show overdue)$/.test(q))matches=invoices.filter(i=>i.chaseable);
 else if(!/^(morning brief|brief|status|summary|show all|all invoices)$/.test(q))return {kind:'help',title:'Command not recognised',message:'Try morning brief, show overdue, find Amelia, why F-1042, activity, routines or operations. No action was taken.',cards:[]};
 const balances={};for(const i of invoices.filter(i=>i.chaseable))balances[i.currency]=(balances[i.currency]||0)+Number(i.amount);
 return {kind:'invoices',title:q.includes('brief')?'Your collection brief':`${matches.length} invoice(s) found`,message:`${invoices.filter(i=>i.chaseable).length} overdue. ${state.proposals.filter(p=>p.status==='pending').length} drafts awaiting review. ${state.paused?'Paused.':'Approval required for every send.'}`,balances:Object.fromEntries(Object.entries(balances).map(([k,v])=>[k,v.toFixed(2)])),cards:matches.map(i=>explain(state,i))};
}

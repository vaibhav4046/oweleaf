// This is an in-tab simulation adapter for the static walkthrough, not server security.
(()=>{'use strict';const original=window.fetch.bind(window),key='oweleaf-static-v1';let data,paused=false,holds={},proposals=[];
const ready=original('./fixture-data.json').then(r=>{if(!r.ok)throw Error('Sample data unavailable');return r.json()}).then(d=>{data=d;proposals=structuredClone(d.proposals);try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved){paused=!!saved.paused;holds=saved.holds||{};proposals=saved.proposals||proposals}}catch{}});
const save=()=>{try{sessionStorage.setItem(key,JSON.stringify({paused,holds,proposals}))}catch{}};
window.farthingSession=Promise.resolve({authenticated:true,role:'owner',username:'sample',fixtureOpen:true});
window.fetch=async(url,opt={})=>{if(typeof url!=='string'||!url.startsWith('/api/'))return original(url,opt);await ready;let body={};try{body=JSON.parse(opt.body||'{}')}catch{return Response.json({error:'Invalid sample input'},{status:400})}
try{let result={};if(url==='/api/desk')result={mock:true,paused,invoices:data.invoices.map(invoice=>({invoice,hold:holds[invoice.payerEmail]||null}))};
else if(url==='/api/state')result={mock:true,paused,proposals,brain:{provider:'heuristic',model:'rules-ladder / static sample'}};
else if(url==='/api/hold'){if(body.reason===null)delete holds[body.email];else{if(typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>240)throw Error('Use a sample note of 1 to 240 characters');holds[body.email]={reason:body.reason.trim()}}}
else if(url==='/api/pause'||url==='/api/resume')paused=url==='/api/pause';
else if(url==='/api/scan')result={scannedCount:data.invoices.length,newProposals:[]};
else if(url==='/api/auth/logout'){try{sessionStorage.removeItem(key)}catch{};location.reload();return Response.json({reset:true})}
else{const m=url.match(/^\/api\/proposals\/([^/]+)\/(approve|reject|restore)$/),p=m&&proposals.find(p=>p.id===decodeURIComponent(m[1])),i=p&&data.invoices.find(i=>i.id===p.invoiceId);if(!p||(m[2]==='restore'?p.status!=='rejected':p.status!=='pending'))throw Error('No pending sample draft');if(m[2]==='approve'&&(paused||holds[i.payerEmail]||!i.chaseable))throw Error('Sample is paused, held or not eligible');p.status=m[2]==='restore'?'pending':m[2]==='approve'?'approved':'rejected'}save();return Response.json(result)}catch(e){return Response.json({error:e.message},{status:400})}};
// Keep the shared UI's logout redirect from leaving the sample. Reset reloads above.
})();

import {parseTraceLines} from './persistence.js';
// Farthing server: node:http, zero dependencies.
// Serves the approval-queue UI, the JSON API, and the 24/7 scan scheduler.
//   npm run demo   -> mock PayPal fixture, no credentials needed
//   npm start      -> live/sandbox via .env (see .env.example)

import { createServer } from 'node:http';
import {randomBytes} from 'node:crypto';
import {LocalAuth} from './auth.js';
import {importCase,reviewCase,addNote,addTask,setTask,workspaceSnapshot,workInbox} from './workspace.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import {fileURLToPath} from 'node:url';
const PUBLIC_ROOT=fileURLToPath(new URL('./public/',import.meta.url));
import { config as loadEnv } from './env.js';
import { PayPalClient, invoiceSummary } from './paypal.js';
import { MockPayPalClient } from './mock-paypal.js';
import { fixtureOperations } from './operations.js';
import {tools as readOnlyTools} from './mcp-tools.js';
import { controls, PLAYBOOKS, updateControls, setHold, audit, answerCommand, explain } from './desk.js';
import { createBrain } from './brain/index.js';
import { loadState, saveState, scan, approve, reject, restore, reconcileDelivery } from './agent.js';

loadEnv();

const PORT = Number(process.env.PORT || 4173);
const MOCK = process.env.FARTHING_MOCK === '1';
const sourceEnvironment=MOCK?'fixture':(process.env.PAYPAL_ENV||'sandbox');

const paypal = MOCK
  ? new MockPayPalClient()
  : new PayPalClient({
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      env: process.env.PAYPAL_ENV || 'sandbox',
    });

const brain = createBrain({
  timeoutMs: Number(process.env.BRAIN_TIMEOUT_MS || 30000),
  provider: process.env.BRAIN_PROVIDER || 'heuristic',
  ollamaHost: process.env.OLLAMA_HOST,
  ollamaModel: process.env.OLLAMA_MODEL,
  ollamaNumGpu: process.env.OLLAMA_NUM_GPU,
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL,
  gentleMaxDays: process.env.GENTLE_MAX_DAYS,
  firmMaxDays: process.env.FIRM_MAX_DAYS,
});

const auth=new LocalAuth({fixtureOpen:MOCK&&process.env.FARTHING_AUTH_MODE==='open-fixture'});
if(auth.setupCode&&!auth.fixtureOpen)console.log('Oweleaf local setup code: '+auth.setupCode);
if(auth.fixtureOpen)console.warn('WARNING: explicit open fixture mode. No account authentication. Never use with private data.');
const state = loadState();
if(!state.controls){state.controls=controls(state);const n=Number(process.env.SCAN_INTERVAL_MINUTES||60);state.controls.intervalMinutes=Number.isInteger(n)&&n>=5&&n<=10080?n:60;}
let timer;
function scheduleRoutine(){
 clearTimeout(timer);const c=controls(state);state.nextScanAt=c.routineEnabled?new Date(Date.now()+c.intervalMinutes*60000).toISOString():null;
 if(c.routineEnabled)timer=setTimeout(async()=>{try{await scan({paypal,brain,state})}catch(e){audit(state,'scan_failed',e.message);saveState(state)}scheduleRoutine();},c.intervalMinutes*60000).unref();
}
async function readBody(req){let body='',bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);body+=chunk;if(bytes>32768){const e=Error('Request too large');e.status=413;throw e;}}try{return JSON.parse(body||'{}')}catch{const e=Error('Invalid JSON body');e.status=400;throw e;}}


function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

async function route(req, res, url) {
  if (![`localhost:${PORT}`,`127.0.0.1:${PORT}`].includes(req.headers.host)) return json(res,403,{error:'Unexpected host'});
  // Local dashboard only. Reject foreign origins, including hostile websites
  // trying to POST into a local service. No public hosting without real auth.
  if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `http://127.0.0.1:${PORT}` && req.headers.origin !== `http://localhost:${PORT}`) return json(res, 403, { error: 'Foreign origin refused' });
  if(req.method==='GET'&&url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
  const identity=auth.identify(req);
  if(req.method==='GET'&&url.pathname==='/api/auth/session')return json(res,200,{authenticated:!!identity,username:identity?.username,role:identity?.role,csrf:identity?.csrf,needsSetup:!!auth.setupCode,fixtureOpen:auth.fixtureOpen,sourceEnvironment});
  if(req.method==='POST'&&['/api/auth/setup','/api/auth/login'].includes(url.pathname)){
    try{const body=await readBody(req);const rateKey='auth:'+String(body.username||'').toLowerCase().slice(0,40);auth.checkRate(rateKey);if(url.pathname.endsWith('setup'))auth.setup(body);const session=auth.login(body,rateKey);res.setHeader('Set-Cookie',auth.cookie(session.secret));audit(state,'local_login',session.username);saveState(state);return json(res,200,{ok:true,csrf:session.csrf,username:session.username,role:session.role});}catch(e){audit(state,'local_auth_failed','Authentication refused; no secret content recorded');saveState(state);return json(res,e.status||400,{error:e.message});}
  }
  const publicPaths=['/login.html','/login.js','/session.js','/ui.css','/desk.css','/workspace.css'];
  const publicAsset=publicPaths.includes(url.pathname)||url.pathname.startsWith('/fonts/');
  if(!publicAsset){const denied=auth.authorize(req,identity);if(denied){if(req.method==='GET'&&!url.pathname.startsWith('/api/')){res.writeHead(302,{Location:'/login.html','Cache-Control':'no-store'});return res.end();}return json(res,denied.code,{error:denied.error});}}
  if(req.method==='POST'&&url.pathname==='/api/auth/logout'){auth.logout(req);res.setHeader('Set-Cookie',auth.cookie('',{clear:true}));return json(res,200,{ok:true});}
  if(req.method==='POST'&&url.pathname==='/api/auth/users'){
   if(identity?.role!=='owner')return json(res,403,{error:'Owner access required'});
   try{const body=await readBody(req);if(!['operator','reader'].includes(body.role))throw Error('Choose operator or reader');const u=auth.createUser(body);audit(state,'local_user_created',u.username+' / '+u.role);saveState(state);return json(res,200,u)}catch(e){return json(res,e.status||400,{error:e.message});}
  }
  if(req.method==='POST'&&url.pathname==='/api/auth/token'){try{if(auth.fixtureOpen)throw Error('Sign in to use authenticated MCP');const token=auth.token(identity);audit(state,'mcp_token_created',identity.username+' / read-only / seven days');saveState(state);return json(res,200,token);}catch(e){return json(res,403,{error:e.message})}}
  if(req.method==='POST'&&url.pathname==='/api/auth/revoke-tokens'){if(identity?.role!=='owner')return json(res,403,{error:'Owner access required'});auth.revokeTokens();audit(state,'mcp_tokens_revoked',identity.username);saveState(state);return json(res,200,{ok:true});}
  if(req.method==='GET'&&url.pathname==='/api/workspace')return json(res,200,workspaceSnapshot(state));
  if(req.method==='GET'&&url.pathname==='/api/work-inbox')return json(res,200,workInbox(state,(await paypal.listInvoices()).map(i=>invoiceSummary(i,new Date()))));
  if(req.method==='POST'&&url.pathname.startsWith('/api/workspace/')){
   const actions={import:importCase,review:reviewCase,note:addNote,task:addTask,'task-status':setTask},name=url.pathname.split('/').pop();if(!actions[name])return json(res,404,{error:'Unknown workspace action'});
   try{const result=actions[name](state,await readBody(req));audit(state,'workspace_'+name,JSON.stringify({id:result.id,version:result.version,actor:identity?.username}));saveState(state);return json(res,200,result);}catch(e){return json(res,e.status||400,{error:e.message})}
  }
  if (req.method === 'POST' && ['/api/pause','/api/resume'].includes(url.pathname)) {
    state.paused = url.pathname === '/api/pause'; audit(state,state.paused?'paused':'resumed','Manual control; sends still require individual approval');saveState(state);
    return json(res, 200, { paused: state.paused });
  }

  if(req.method==='GET'&&url.pathname==='/api/mcp-info')return json(res,200,{transport:'stdio',command:'node src/mcp-server.js',protocol:'2025-03-26',tools:readOnlyTools,notice:'Read only. Requires the local app to be running. No sending tool. Not a hosted service.'});
  if(req.method==='GET'&&url.pathname==='/api/desk'){
    const invoices=(await paypal.listInvoices()).map(i=>invoiceSummary(i,new Date()));
    return json(res,200,{mock:MOCK,sourceEnvironment,controls:controls(state),playbooks:PLAYBOOKS,nextScanAt:state.nextScanAt||null,lastScanAt:state.lastScanAt||null,paused:!!state.paused,invoices:invoices.map(i=>explain(state,i)),activity:(state.activity||[]).slice(-100).reverse()});
  }
  if(req.method==='GET'&&url.pathname==='/api/command'){
    if((url.searchParams.get('q')||'').length>500)return json(res,400,{error:'Command must be 500 characters or fewer'});
    const invoices=(await paypal.listInvoices()).map(i=>invoiceSummary(i,new Date()));
    return json(res,200,answerCommand(url.searchParams.get('q')||'help',invoices,state));
  }
  if(req.method==='POST'&&url.pathname==='/api/controls'){
    try{const c=updateControls(state,await readBody(req));audit(state,'controls_changed',`${c.playbookId}; routine ${c.routineEnabled?'on':'off'}; ${c.intervalMinutes} minutes`);scheduleRoutine();saveState(state);return json(res,200,{controls:c,nextScanAt:state.nextScanAt});}catch(e){return json(res,e.status||400,{error:e.message});}
  }
  if(req.method==='POST'&&url.pathname==='/api/hold'){
    try{const input=await readBody(req),invoices=(await paypal.listInvoices()).map(i=>invoiceSummary(i,new Date()));
      if(!invoices.some(i=>String(i.payerEmail||'').toLowerCase()===String(input.email).toLowerCase()))throw Error('Payer not found in current invoice account');
      const c=setHold(state,input.email,input.reason);audit(state,input.reason===null?'payer_hold_removed':'payer_hold_added',input.email);saveState(state);return json(res,200,{controls:c});
    }catch(e){return json(res,e.status||400,{error:e.message});}
  }
  if(req.method==='GET'&&url.pathname==='/api/evidence'){
    const invoices=(await paypal.listInvoices()).map(i=>invoiceSummary(i,new Date()));
    return json(res,200,{kind:'farthing-review-bundle',exportedAt:new Date().toISOString(),mode:MOCK?'fixture':'account',proofOfPayment:false,brain:{provider:brain.name,model:brain.model},controls:controls(state),invoices,workspace:workspaceSnapshot(state),proposals:state.proposals,actions:state.actions,activity:state.activity||[],limitations:['No proof of payment','No exactly-once guarantee across crashes','No general browser agent','Live integration must be verified separately']});
  }
  if (req.method === 'GET' && url.pathname === '/api/operations') {
    if (!MOCK) return json(res, 409, {error: 'Demo operations available only in fixture mode. Use readWorkflow with an authenticated sandbox client for integration tests.'});
    return json(res, 200, fixtureOperations());
  }
  if (req.method === 'GET' && url.pathname === '/api/state') {
    return json(res, 200, {
      mock: MOCK, sourceEnvironment,
      brain: { provider: brain.name, model: brain.model },
      paused: !!state.paused, lastScanAt: state.lastScanAt || null,
      proposals: state.proposals,
      actions: state.actions.slice(-50),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/invoices') {
    const invoices = await paypal.listInvoices();
    const summaries = invoices.map((inv) => invoiceSummary(inv, new Date()));
    return json(res, 200, { mock: MOCK, sourceEnvironment, invoices: summaries });
  }
  if (req.method === 'GET' && url.pathname === '/api/traces') {
    const file = resolve('traces/decisions.jsonl');
    const result = parseTraceLines(existsSync(file)?readFileSync(file,'utf8'):'');
    return json(res, 200, result);
  }
  if (req.method === 'POST' && url.pathname === '/api/scan') {
    const result = await scan({ paypal, brain, state });
    return json(res, 200, { scannedCount: result.scanned.length, newProposals: result.newProposals });
  }
  const approveMatch = url.pathname.match(/^\/api\/proposals\/(.+)\/approve$/);
  if (req.method === 'POST' && approveMatch) {
    try {
      const { proposal } = await approve({ paypal, state, proposalId: decodeURIComponent(approveMatch[1]) });
      audit(state,'invoice_approval',identity.username+' / '+proposal.id);saveState(state);return json(res, 200, { ok: true, proposal });
    } catch (e) {
      return json(res, 400, { ok: false, error: e.message });
    }
  }
  const reconcileMatch=url.pathname.match(/^\/api\/proposals\/(.+)\/reconcile$/);
  if(req.method==='POST'&&reconcileMatch){
    if(identity?.role!=='owner')return json(res,403,{error:'Owner must check the provider record'});
    try{const input=await readBody(req);const proposal=await reconcileDelivery({paypal,state,proposalId:decodeURIComponent(reconcileMatch[1]),...input});return json(res,200,{ok:true,proposal})}catch(e){return json(res,e.status||400,{error:e.message})}
  }
  const rejectMatch = url.pathname.match(/^\/api\/proposals\/(.+)\/reject$/);
  if (req.method === 'POST' && rejectMatch) {
    try {
      return json(res, 200, { ok: true, proposal: reject({ state, proposalId: decodeURIComponent(rejectMatch[1]) }) });
    } catch (e) {
      return json(res, 400, { ok: false, error: e.message });
    }
  }
  const restoreMatch=url.pathname.match(/^\/api\/proposals\/(.+)\/restore$/);
  if(req.method==='POST'&&restoreMatch){try{return json(res,200,{ok:true,proposal:restore({state,proposalId:decodeURIComponent(restoreMatch[1])})})}catch(e){return json(res,400,{error:e.message})}}
  // static UI
  if (req.method === 'GET') {
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = resolve(join(PUBLIC_ROOT, path));
    if (existsSync(file) && file.startsWith(resolve(PUBLIC_ROOT) + sep)) {
      const ext = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.ttf') ? 'font/ttf' : path.endsWith('.woff2') ? 'font/woff2' : path.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
      res.statusCode=200;res.setHeader('Content-Type',ext);
      const raw=readFileSync(file);if(ext==='text/html'){const nonce=randomBytes(18).toString('base64');res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);return res.end(raw.toString().replace(/<script(?![^>]*\bsrc=)/g,`<script nonce="${nonce}"`).replace('</head>','<script src="/session.js"></script></head>'));}return res.end(raw);
    }
  }
  json(res, 404, { error: 'not found' });
}

const server = createServer((req, res) => {
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Cache-Control','no-store');
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  route(req, res, url).catch((e) => json(res, e.status||500, { error: e.message }));
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Oweleaf listening on http://127.0.0.1:${PORT}  (mode: ${MOCK ? 'MOCK fixture data' : (process.env.PAYPAL_ENV || 'sandbox')}, brain: ${brain.name}/${brain.model})`);
  // boot scan, then the 24/7 loop
  try {
    const r = controls(state).routineEnabled ? await scan({ paypal, brain, state }) : {scanned:[],newProposals:[]};
    console.log(`scan: ${r.scanned.length} invoices, ${r.newProposals.length} new proposals`);
  } catch (e) {
    console.error(`scan failed: ${e.message}`);
  }
  scheduleRoutine();
});

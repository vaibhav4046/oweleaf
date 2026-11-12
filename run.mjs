// MIT. Run readable checked-in code, with fresh state for the invented-data demo.
import{mkdtempSync,readdirSync,cpSync}from'node:fs';import{tmpdir}from'node:os';import{join,dirname}from'node:path';import{fileURLToPath}from'node:url';import{spawn}from'node:child_process';
const root=dirname(fileURLToPath(import.meta.url)),test=process.argv.includes('--test'),demo=process.argv.includes('--demo');if(test===demo)throw Error('Choose --test or --demo. Persistent mode: npm start.');
const work=mkdtempSync(join(tmpdir(),'oweleaf-'));
if(test){for(const name of ['src','test','package.json','api','docs'])cpSync(join(root,name),join(work,name),{recursive:true});}
const testRoot=test?work:root;
const args=test?['--test',...readdirSync(join(testRoot,'test')).filter(f=>f.endsWith('.test.js')).map(f=>join(testRoot,'test',f))]:[join(root,'src/server.js')];
console.log(`Oweleaf ${test?'tests':'invented-data demo'}: ${work}`);if(demo)console.log('No login needed. Open http://127.0.0.1:'+(process.env.PORT||4173)+'. Temporary fixture data only. No PayPal calls. '+(process.argv.includes('--ai')?'Local AI model via Ollama (qwen3:1.7b unless OLLAMA_MODEL is set).':'No model: add --ai to use a local Ollama model.')+' Persistent/private work uses npm start with local authentication.');
const child=spawn(process.execPath,args,{cwd:work,stdio:'inherit',env:{...process.env,FARTHING_MOCK:'1',BRAIN_PROVIDER:demo&&process.argv.includes('--ai')?'ollama':'heuristic',...(demo?{FARTHING_AUTH_MODE:'open-fixture',OWELEAF_DEMO_SEED:'1'}:{})}});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('error',e=>{console.error(e.message);process.exitCode=1});child.on('exit',code=>process.exitCode=code??1);

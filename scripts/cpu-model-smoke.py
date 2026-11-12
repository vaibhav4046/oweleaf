import subprocess,time,json,urllib.request,pathlib,os
root=pathlib.Path.cwd();out=root/'evals/CPU_MODEL_SMOKE.json'
cmd=[os.environ.get('LLAMA_SERVER','llama-server'),'-m',os.environ.get('OWELEAF_GGUF','farthing-v2-q4_k_m.gguf'),'--host','127.0.0.1','--port','8089','-t','1','-tb','1','-c','2048','-np','1','-ngl','0','--chat-template-kwargs','{"enable_thinking":false}','--no-webui']
start=time.monotonic();log=open('/tmp/oweleaf-llama.log','w');p=subprocess.Popen(cmd,stdout=log,stderr=log)
report={'timestamp':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'command':cmd,'scope':'one isolated CPU-only inference on a provided 1-core Xeon / 2GB hosted environment, not a normal laptop, not PayPal integration','model':'farthing-v2-q4_k_m.gguf','sourceBinary':'https://github.com/ggml-org/llama.cpp/releases/download/b12283/llama-b12283-bin-ubuntu-x64.tar.gz'}
try:
 for n in range(150):
  if p.poll() is not None:raise RuntimeError('llama server exited '+str(p.returncode))
  try:
   if urllib.request.urlopen('http://127.0.0.1:8089/health',timeout=1).status==200:break
  except Exception:time.sleep(.2)
 else:raise RuntimeError('readiness timed out')
 report['loadSeconds']=time.monotonic()-start
 prompt=subprocess.check_output(['node','--input-type=module','-e',"import {buildDecisionPrompt} from './src/brain/prompts.js'; console.log(buildDecisionPrompt({number:'CPU-TEST-1',currency:'GBP',amount:'450.00',dueDate:'2026-11-08',daysOverdue:3,status:'SENT',payerName:'Amelia Example'}))"],cwd=root,text=True)
 body={'model':'oweleaf-v2','messages':[{'role':'user','content':prompt}],'temperature':.1,'max_tokens':300,'response_format':{'type':'json_object'},'chat_template_kwargs':{'enable_thinking':False}}
 t=time.monotonic();r=urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8089/v1/chat/completions',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=95);res=json.load(r)
 report['requestSeconds']=time.monotonic()-t;report['request']=body;report['response']=res
 raw=res['choices'][0]['message'].get('content','');check=subprocess.run(['node','--input-type=module','-e',"import{parseDecision}from'./src/brain/prompts.js';let a='';for await(const x of process.stdin)a+=x;console.log(JSON.stringify(parseDecision(a)))"],cwd=root,input=raw,text=True,capture_output=True)
 report['parsedDecision']=json.loads(check.stdout);report['schemaPass']=report['parsedDecision'] is not None
 check2=subprocess.run(['node','--input-type=module','-e',"import{draftIssue}from'./src/brain/draft-guard.js';let a='';for await(const x of process.stdin)a+=x;console.log(JSON.stringify(draftIssue(JSON.parse(a),{number:'CPU-TEST-1',currency:'GBP',amount:'450.00',dueDate:'2026-11-08'})))"],cwd=root,input=json.dumps(report['parsedDecision']),text=True,capture_output=True)
 report['guardIssue']=json.loads(check2.stdout);report['semanticGuardPass']=report['guardIssue'] is None;report['semanticCaveat']='Known-class deterministic guard only; no claim of exhaustive factual or injection safety.'
 try:report['rssKb']=int(pathlib.Path('/proc/'+str(p.pid)+'/status').read_text().split('VmRSS:')[1].split()[0])
 except Exception:pass
except Exception as e:report['pass']=False;report['error']=str(e)
finally:
 p.terminate()
 try:p.wait(timeout=3)
 except subprocess.TimeoutExpired:p.kill();p.wait()
 log.close();out.write_text(json.dumps(report,indent=2));print(json.dumps(report))

// Fail closed. A damaged safety ledger or account file must never silently reset.
import {existsSync,readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
// Windows can refuse a rename while another handle (a second writer, antivirus,
// indexer) briefly holds the destination. POSIX never does. Retry a bounded
// number of times, then fail loudly with the temp file removed; never drop a write silently.
const TRANSIENT=new Set(['EPERM','EBUSY','EACCES']),RENAME_ATTEMPTS=12,RENAME_WAIT_MS=15;
export function replaceFile(temporary,file){
 for(let attempt=1;;attempt++){
  try{return renameSync(temporary,file)}
  catch(e){
   if(!TRANSIENT.has(e.code)||attempt>=RENAME_ATTEMPTS){rmSync(temporary,{force:true});throw e}
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,RENAME_WAIT_MS*attempt);
  }
 }
}
export function readLedger(file,fallback,valid){
 const marker=file+'.recovery-required';
 if(existsSync(marker))throw Error(`Oweleaf stopped: recovery required for ${file}. Read ${marker}; restore the quarantined file from a checked backup before removing the marker. No reminders were sent.`);
 if(!existsSync(file))return fallback;
 try{const value=JSON.parse(readFileSync(file,'utf8'));if(!valid(value))throw Error('Invalid ledger shape');return value}
 catch(e){const quarantine=file+'.corrupt-'+Date.now();renameSync(file,quarantine);writeFileSync(marker,`Oweleaf stopped safely. Corrupt file quarantined at ${quarantine}. Restore a checked backup to ${file}, then remove this marker. Do not start with an empty safety ledger or reset accounts blindly. No automatic recovery or sends.\n`,{mode:0o600});throw Error(`Oweleaf stopped: invalid saved data at ${file}. Quarantined at ${quarantine}. Read ${marker} for recovery. No reminders were sent.`);}
}
export function parseTraceLines(text){const traces=[];let skipped=0;for(const line of text.split('\n').slice(-101)){if(!line.trim())continue;try{traces.push(JSON.parse(line))}catch{skipped++}}return {traces:traces.slice(-100),skipped};}

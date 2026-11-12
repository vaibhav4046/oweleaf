// Fail closed. A damaged safety ledger or account file must never silently reset.
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
export function readLedger(file,fallback,valid){
 const marker=file+'.recovery-required';
 if(existsSync(marker))throw Error(`Oweleaf stopped: recovery required for ${file}. Read ${marker}; restore the quarantined file from a checked backup before removing the marker. No reminders were sent.`);
 if(!existsSync(file))return fallback;
 try{const value=JSON.parse(readFileSync(file,'utf8'));if(!valid(value))throw Error('Invalid ledger shape');return value}
 catch(e){const quarantine=file+'.corrupt-'+Date.now();renameSync(file,quarantine);writeFileSync(marker,`Oweleaf stopped safely. Corrupt file quarantined at ${quarantine}. Restore a checked backup to ${file}, then remove this marker. Do not start with an empty safety ledger or reset accounts blindly. No automatic recovery or sends.\n`,{mode:0o600});throw Error(`Oweleaf stopped: invalid saved data at ${file}. Quarantined at ${quarantine}. Read ${marker} for recovery. No reminders were sent.`);}
}
export function parseTraceLines(text){const traces=[];let skipped=0;for(const line of text.split('\n').slice(-101)){if(!line.trim())continue;try{traces.push(JSON.parse(line))}catch{skipped++}}return {traces:traces.slice(-100),skipped};}

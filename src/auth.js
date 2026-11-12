// Local-only authentication. Not PayPal OAuth or multi-tenant production auth.
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {readLedger,replaceFile} from './persistence.js';
const kdf={N:32768,r:8,p:1,maxmem:64*1024*1024};
const digest=s=>createHash('sha256').update(s).digest('hex');
export class LocalAuth {
 constructor({file=resolve('data/auth.json'),now=()=>Date.now(),fixtureOpen=false}={}){this.file=file;this.now=now;this.fixtureOpen=fixtureOpen;this.db=readLedger(file,{users:[],tokens:[]},d=>d&&Array.isArray(d.users)&&Array.isArray(d.tokens));this.sessions=new Map();this.failures=new Map();this.setupCode=this.db.users.length?null:randomBytes(24).toString('hex');}
 save(){mkdirSync(dirname(this.file),{recursive:true,mode:0o700});writeFileSync(this.file+'.tmp',JSON.stringify(this.db),{mode:0o600});replaceFile(this.file+'.tmp',this.file);}
 user(input){if(typeof input!=='string'||!/^[a-zA-Z0-9_.-]{3,40}$/.test(input))throw Error('Username needs 3-40 letters, digits, dot, dash or underscore');return input.toLowerCase()}
 password(input){if(typeof input!=='string'||input.length<12||input.length>128)throw Error('Password needs 12-128 characters');return input}
 createUser({username,password,role='reader'}){username=this.user(username);password=this.password(password);if(!['owner','operator','reader'].includes(role))throw Error('Invalid role');if(this.db.users.some(u=>u.username===username))throw Error('Username already exists');if(this.db.users.length>=20)throw Error('Local user limit reached');const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64,kdf).toString('hex');const u={username,salt,hash,role};this.db.users.push(u);this.save();return {username,role};}
 setup({code,username,password}){if(!this.setupCode||typeof code!=='string'||digest(code)!==digest(this.setupCode))throw Error('Invalid or expired setup code');const u=this.createUser({username,password,role:'owner'});this.setupCode=null;return u}
 checkRate(key){const row=this.failures.get(key);if(row&&row.until>this.now()&&row.count>=5)throw Error('Too many attempts. Wait 15 minutes');}
 fail(key){const old=this.failures.get(key);this.failures.set(key,{count:old&&old.until>this.now()?old.count+1:1,until:this.now()+900000});if(this.failures.size>200)this.failures.delete(this.failures.keys().next().value)}
 login({username,password},key='local'){this.checkRate(key);const u=this.db.users.find(x=>x.username===String(username).toLowerCase());const actual=scryptSync(typeof password==='string'&&password.length<=128?password:'',u?.salt||'missing-user-salt',64,kdf);const wanted=u?Buffer.from(u.hash,'hex'):Buffer.alloc(64);if(!u||!timingSafeEqual(actual,wanted)){this.fail(key);throw Error('Invalid username or password')};this.failures.delete(key);const secret=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');if(this.sessions.size>=100)this.sessions.delete(this.sessions.keys().next().value);this.sessions.set(digest(secret),{username:u.username,role:u.role,csrf,created:this.now(),last:this.now()});return {secret,csrf,username:u.username,role:u.role};}
 identify(req){if(this.fixtureOpen)return {username:'fixture-open',role:'owner',csrf:null,fixtureOpen:true};
 const bearer=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(bearer){const t=this.db.tokens.find(t=>t.hash===digest(bearer)&&t.expires>this.now());return t?{username:t.username,role:'reader',token:true}:null;}
 const cookie=req.headers.cookie?.match(/(?:^|;\s*)farthing_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!cookie)return null;const id=digest(cookie),s=this.sessions.get(id);if(!s)return null;if(this.now()-s.created>8*3600000||this.now()-s.last>30*60000){this.sessions.delete(id);return null;}s.last=this.now();return {...s,id};}
 logout(req){const s=this.identify(req);if(s?.id)this.sessions.delete(s.id)}
 authorize(req,identity){if(!identity)return {code:401,error:'Sign in required'};if(req.method==='GET')return null;if(identity.token||(identity.role==='reader'&&req.url!=='/api/auth/logout'))return {code:403,error:'Read-only access'};if(!identity.fixtureOpen&&req.headers['x-csrf-token']!==identity.csrf)return {code:403,error:'CSRF check failed'};return null;}
 token(identity){if(identity?.role!=='owner')throw Error('Owner access required');const secret=randomBytes(32).toString('hex');const expires=this.now()+7*86400000;this.db.tokens=this.db.tokens.filter(t=>t.expires>this.now());this.db.tokens.push({id:randomBytes(8).toString('hex'),hash:digest(secret),username:identity.username,expires});this.save();return {secret,expires:new Date(expires).toISOString(),scope:'Read only; local MCP access; expires after seven days. Copy once to a secure store.'};}
 revokeTokens(){this.db.tokens=[];this.save()}
 cookie(secret,{clear=false,secure=false}={}){return `farthing_session=${clear?'':secret}; Path=/; HttpOnly; SameSite=Strict${clear?'; Max-Age=0':''}${secure?'; Secure':''}`}
}

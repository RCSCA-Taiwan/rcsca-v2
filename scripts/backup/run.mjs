import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,realpath,writeFile,readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readKey,seal,unseal,discard,readManifest} from './archive.mjs';

const repo=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const tools=['pg_dump','pg_restore','psql'];
const envNames=['PGHOST','PGPORT','PGDATABASE','PGUSER','RCSCA_BACKUP_PROJECT_REF','RCSCA_BACKUP_DIRECTORY','RCSCA_BACKUP_KEY'];
const inventorySQL=`select json_build_object('project_ref',current_setting('app.settings.project_ref',true),'database_version',current_setting('server_version'),'objects',coalesce((select json_agg(json_build_object('id',id,'bucket_id',bucket_id,'name',name,'version',version,'updated_at',updated_at,'size',metadata->>'size') order by bucket_id,name) from storage.objects),'[]'::json));`;
function available(name){const r=spawnSync(name,['--version'],{stdio:'ignore'});return r.status===0;}
function dbEnv(){
 const result={PATH:process.env.PATH,PGCONNECT_TIMEOUT:'20',PGSSLMODE:'verify-full'};
 for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGPASSFILE','PGSSLROOTCERT'])if(process.env[key])result[key]=process.env[key];
 return result;
}
function dbProcess(command,args){
 const child=spawn(command,args,{env:dbEnv(),stdio:['ignore','pipe','pipe']});
 child.stderr.resume();
 const done=new Promise((resolve,reject)=>{child.on('error',()=>reject(Error(`${command} could not start.`)));child.on('close',code=>code===0?resolve():reject(Error(`${command} failed; no complete backup was recorded. Check connection and server permissions without printing credentials.`)));});
 // Child can fail while its stream is still being consumed.
 done.catch(()=>{});
 return {child,done};
}
async function inventory(){
 const {child,done}=dbProcess('psql',['--no-psqlrc','--no-align','--tuples-only','--set','ON_ERROR_STOP=1','--command',inventorySQL]);
 let text='';for await(const chunk of child.stdout){text+=chunk;if(text.length>16*1024*1024){child.kill();throw Error('Storage inventory exceeds supported size.');}}
 await done;return JSON.parse(text);
}
export async function externalDirectory(input){
 if(!input||!path.isAbsolute(input))throw Error('Backup directory must be an absolute path outside the source checkout.');
 await mkdir(input,{recursive:true,mode:0o700});
 const root=await realpath(repo),resolved=await realpath(input),relative=path.relative(root,resolved);
 if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Backups must not be stored inside the source checkout.');
 return resolved;
}
export function validateTarget(env){
 const ref=env.RCSCA_BACKUP_PROJECT_REF;
 if(!/^[a-z]{20}$/.test(ref||''))throw Error('An explicit Supabase project reference is required.');
 const direct=env.PGHOST===`db.${ref}.supabase.co`&&env.PGUSER==='postgres';
 const pooler=/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(env.PGHOST||'')&&env.PGUSER===`postgres.${ref}`;
 if(!direct&&!pooler)throw Error('Database host/user do not match the selected project.');
 if(!['5432'].includes(env.PGPORT)||env.PGDATABASE!=='postgres')throw Error('Use a direct or session-pooler connection on port 5432 to the postgres database.');
}
async function requireReady(){
 const missing=envNames.filter(key=>!process.env[key]);
 if(!process.env.PGPASSWORD&&!process.env.PGPASSFILE)missing.push('PGPASSWORD or PGPASSFILE');
 const absent=tools.filter(name=>!available(name));
 if(missing.length||absent.length)throw Error(`Backup is not ready. Missing settings: ${missing.join(', ')||'none'}; missing tools: ${absent.join(', ')||'none'}. No backup was taken.`);
 validateTarget(process.env);return readKey(process.env.RCSCA_BACKUP_KEY);
}
function safePayload(name){if(!/^(database|manifest|object-[0-9]{8})\.enc$/.test(name))throw Error('Invalid archive payload path.');return name;}
export async function verifyBundle(directory,key,{requireComplete=true}={}){
 const manifestFile=path.join(directory,'manifest.enc');
 const manifest=await readManifest(manifestFile,key);
 if(manifest.format!=='RCSCA-backup-v1'||!Array.isArray(manifest.payloads)||!manifest.payloads.length)throw Error('Invalid backup manifest.');
 const seen=new Set();
 for(const item of manifest.payloads){
  const filename=safePayload(item.file);
  if(filename==='manifest.enc'||seen.has(filename))throw Error('Duplicate or recursive payload.');seen.add(filename);
  const actual=await unseal(path.join(directory,filename),key,discard());
  if(actual.sha256!==item.sha256||actual.bytes!==item.bytes)throw Error('Backup payload does not match its manifest.');
 }
 if(!seen.has('database.enc'))throw Error('Database payload missing.');
 if(manifest.objects.length!==manifest.payloads.length-1)throw Error('Storage payload count mismatch.');
 if(requireComplete){
  const marker=JSON.parse(await readFile(path.join(directory,'COMPLETE.json'),'utf8'));
  const encrypted=await readFile(manifestFile);
  if(marker.manifest_sha256!==createHash('sha256').update(encrypted).digest('hex'))throw Error('Completion record does not match authenticated manifest.');
 }
 return {database:true,objects:manifest.objects.length,payloads:manifest.payloads.length,project_ref:manifest.project_ref,created_at:manifest.created_at};
}
async function checkDatabaseCatalog(directory,key){
 const child=spawn('pg_restore',['--list'],{env:{PATH:process.env.PATH},stdio:['pipe','pipe','ignore']});
 let catalog='';child.stdout.on('data',chunk=>{catalog+=chunk;if(catalog.length>16*1024*1024)child.kill();});
 const done=new Promise((resolve,reject)=>{child.on('error',()=>reject(Error('pg_restore could not start.')));child.on('close',code=>code===0?resolve():reject(Error('Database archive catalog is invalid.')));});done.catch(()=>{});
 try{await unseal(path.join(directory,'database.enc'),key,child.stdin);await done;}catch(error){child.kill();throw error;}
 for(const schema of ['public','private','auth','storage'])if(!catalog.includes(`SCHEMA - ${schema}`))throw Error('Database archive is missing a required schema.');
}
async function create(){
 const key=await requireReady(),root=await externalDirectory(process.env.RCSCA_BACKUP_DIRECTORY);
 const before=await inventory();
 if(before.project_ref&&before.project_ref!==process.env.RCSCA_BACKUP_PROJECT_REF)throw Error('Database project reference mismatch.');
 const secret=process.env.RCSCA_BACKUP_STORAGE_KEY;
 if(before.objects.length&&!secret)throw Error('Storage objects exist; RCSCA_BACKUP_STORAGE_KEY is required. No complete backup was taken.');
 const run=path.join(root,`rcsca-${process.env.RCSCA_BACKUP_PROJECT_REF}-${new Date().toISOString().replaceAll(':','-')}`);
 await mkdir(run,{mode:0o700});
 const payloads=[],objects=[];
 const {child,done}=dbProcess('pg_dump',['--format=custom','--no-owner','--no-privileges']);
 let database;
 try{database=await seal(child.stdout,path.join(run,'database.enc'),key);await done;}catch(error){child.kill();throw error;}
 payloads.push({file:'database.enc',...database});
 for(const [index,object] of before.objects.entries()){
  const encoded=[object.bucket_id,...object.name.split('/')].map(encodeURIComponent).join('/');
  const url=`https://${process.env.RCSCA_BACKUP_PROJECT_REF}.supabase.co/storage/v1/object/${encoded}`;
  const response=await fetch(url,{headers:{apikey:secret,Authorization:`Bearer ${secret}`},redirect:'error',signal:AbortSignal.timeout(120000)});
  if(!response.ok||!response.body)throw Error('Storage download failed; no complete backup was recorded.');
  const file=`object-${String(index).padStart(8,'0')}.enc`;
  const result=await seal(Readable.fromWeb(response.body),path.join(run,file),key);
  if(object.size!==null&&Number(object.size)!==result.bytes)throw Error('Storage object size changed during backup.');
  payloads.push({file,...result});objects.push({...object,file});
 }
 const after=await inventory();
 if(JSON.stringify(before.objects)!==JSON.stringify(after.objects))throw Error('Storage changed during backup. Retry during a quiet period; no complete backup was recorded.');
 const manifest={format:'RCSCA-backup-v1',project_ref:process.env.RCSCA_BACKUP_PROJECT_REF,created_at:new Date().toISOString(),database_version:before.database_version,payloads,objects,scope:'Logical database snapshot and Storage object payloads. External secrets, role passwords, provider settings and deployed code are not included. Restore drill still required.'};
 await seal(Readable.from([JSON.stringify(manifest)]),path.join(run,'manifest.enc'),key);
 await verifyBundle(run,key,{requireComplete:false});
 await checkDatabaseCatalog(run,key);
 const manifestHash=createHash('sha256').update(await readFile(path.join(run,'manifest.enc'))).digest('hex');
 await writeFile(path.join(run,'COMPLETE.json'),JSON.stringify({format:'RCSCA-backup-v1',manifest_sha256:manifestHash})+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:'encrypted_backup_verified',directory:run,...await verifyBundle(run,key),restore_drill:'not_performed',offsite_copy:'not_performed'}));
}
export async function main(args=process.argv.slice(2)){
 if(args[0]==='check'){
  const settings=Object.fromEntries([...envNames,'PGPASSWORD','PGPASSFILE','RCSCA_BACKUP_STORAGE_KEY'].map(key=>[key,Boolean(process.env[key])]));
  console.log(JSON.stringify({status:'preflight_only',tools:Object.fromEntries(tools.map(name=>[name,available(name)])),settings,backup_taken:false}));return;
 }
 if(args[0]==='create'){await create();return;}
 if(args[0]==='verify'&&args[1]){console.log(JSON.stringify({status:'archive_integrity_verified',...await verifyBundle(path.resolve(args[1]),readKey(process.env.RCSCA_BACKUP_KEY)),restore_drill:'not_performed'}));return;}
 throw Error('Usage: node scripts/backup/run.mjs check | create | verify /absolute/backup-directory');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});

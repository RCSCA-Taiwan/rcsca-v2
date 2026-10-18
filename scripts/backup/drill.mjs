// Destructive operations are confined to a newly created, unnetworked container.
// This exercises the archive format with synthetic data, never a hosted database.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable,Writable} from 'node:stream';
import {seal,unseal,discard} from './archive.mjs';
import {verifyBundle} from './run.mjs';

const container=`rcsca-backup-drill-${randomUUID()}`;
const directory=await mkdtemp(path.join(tmpdir(),'rcsca-restore-drill-'));
const key=randomBytes(32);
function docker(args,input){
 const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
 if(r.error||r.status!==0)throw Error(`Isolated backup drill failed: ${r.error?.message||r.stderr}`);
 return r.stdout.trim();
}
function sql(database,query){return docker(['exec','-i',container,'psql','-X','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-At'],query);}
function processInContainer(args){
 const child=spawn('docker',['exec','-i',container,...args],{stdio:['pipe','pipe','pipe']});
 child.stderr.resume();
 const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Isolated database archive operation failed.')));});
 done.catch(()=>{});return {child,done};
}
try{
 docker(['run','--detach','--name',container,'--network','none','--env','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17']);
 let ready=false;
 for(let attempt=0;attempt<100;attempt++){
  const r=spawnSync('docker',['exec',container,'pg_isready','-U','postgres'],{stdio:'ignore',timeout:3000});
  if(r.status===0){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,200));
 }
 assert.ok(ready,'Disposable database did not become ready');
 sql('postgres',`create database drill_source; create database drill_restored;`);
 sql('drill_source',`
 create schema private; create schema auth; create schema storage;
 create table auth.users(id integer primary key,email text unique not null);
 create table public.members(id integer generated always as identity primary key,user_id integer references auth.users(id),name text not null);
 create table private.points(id integer generated always as identity primary key,member_id integer references public.members(id),amount integer not null);
 create table storage.objects(id integer primary key,bucket_id text,name text);
 alter table public.members enable row level security;
 create policy member_only on public.members using(user_id=current_setting('drill.user_id',true)::integer);
 create function public.point_balance(integer) returns bigint language sql stable as 'select coalesce(sum(amount),0)::bigint from private.points where member_id=$1';
 insert into auth.users values(1,'fixture@example.invalid');
 insert into public.members(user_id,name) values(1,'Synthetic member');
 insert into private.points(member_id,amount) values(1,100),(1,-30);
 insert into storage.objects values(1,'synthetic','fixture.bin');`);
 const dumped=processInContainer(['pg_dump','-U','postgres','-d','drill_source','--format=custom','--no-owner','--no-privileges']);
 dumped.child.stdin.end();
 const database=await seal(dumped.child.stdout,path.join(directory,'database.enc'),key);await dumped.done;
 const bytes=randomBytes(65537);
 const object=await seal(Readable.from([bytes]),path.join(directory,'object-00000000.enc'),key);
 const manifest={format:'RCSCA-backup-v1',project_ref:'synthetic',created_at:new Date().toISOString(),payloads:[{file:'database.enc',...database},{file:'object-00000000.enc',...object}],objects:[{id:1,bucket_id:'synthetic',name:'fixture.bin',file:'object-00000000.enc'}]};
 await seal(Readable.from([JSON.stringify(manifest)]),path.join(directory,'manifest.enc'),key);
 await writeFile(path.join(directory,'COMPLETE.json'),JSON.stringify({manifest_sha256:createHash('sha256').update(await readFile(path.join(directory,'manifest.enc'))).digest('hex')}));
 // Authenticate every payload before allowing any restore side effects.
 assert.equal((await verifyBundle(directory,key)).objects,1);
 await assert.rejects(unseal(path.join(directory,'database.enc'),randomBytes(32),discard()));
 const restored=processInContainer(['pg_restore','-U','postgres','-d','drill_restored','--exit-on-error','--single-transaction','--no-owner','--no-privileges']);
 await unseal(path.join(directory,'database.enc'),key,restored.child.stdin);await restored.done;
 const snapshot=`select json_build_object('users',(select json_agg(t order by id) from auth.users t),'members',(select json_agg(t order by id) from public.members t),'points',(select json_agg(t order by id) from private.points t),'objects',(select json_agg(t order by id) from storage.objects t),'balance',public.point_balance(1),'rls',(select relrowsecurity from pg_class where oid='public.members'::regclass),'policies',(select count(*) from pg_policy where polrelid='public.members'::regclass));`;
 assert.deepEqual(JSON.parse(sql('drill_restored',snapshot)),JSON.parse(sql('drill_source',snapshot)));
 assert.equal(sql('drill_restored',`insert into public.members(user_id,name) values(1,'After restore') returning id;`).split('\n')[0],'2');
 assert.throws(()=>sql('drill_restored',`insert into private.points(member_id,amount) values(999,1);`),/foreign key/);
 const received=[];
 await unseal(path.join(directory,'object-00000000.enc'),key,new Writable({write(chunk,_encoding,done){received.push(chunk);done();}}));
 assert.deepEqual(Buffer.concat(received),bytes);
 console.log(JSON.stringify({status:'synthetic_restore_drill_passed',checks:['authenticated_bundle','wrong_key_rejected','empty_database_restore','rows_and_balances','rls_and_policy_definitions','foreign_keys','identity_sequence','storage_payload_bytes'],production_backup:false,production_restore:false,offsite_copy:false}));
}finally{
 spawnSync('docker',['rm','--force','--volumes',container],{stdio:'ignore',timeout:30000});
 await rm(directory,{recursive:true,force:true});
 key.fill(0);
}

// Restore a verified Production-origin encrypted bundle into a disposable local Supabase database.
// This never connects to or writes to the hosted Production database.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readKey,readManifest,unseal,discard} from './archive.mjs';
import {verifyBundle} from './run.mjs';

const CLI_VERSION='2.116.0';
const args=process.argv.slice(2);
if(args[0]==='--help'||args[0]==='-h'){
  console.log('Usage: node scripts/backup/rehearse-bundle.mjs /absolute/verified-backup-directory');
  process.exit(0);
}
if(args.length!==1||!path.isAbsolute(args[0]))throw Error('A single absolute verified backup directory is required.');
if(!process.env.RCSCA_BACKUP_KEY)throw Error('RCSCA_BACKUP_KEY is required.');

const directory=path.resolve(args[0]);
const key=readKey(process.env.RCSCA_BACKUP_KEY);
const projectRoot=process.cwd();
const workdir=await mkdtemp(path.join(os.tmpdir(),'rcsca-real-restore-'));
const cli=['-y',`supabase@${CLI_VERSION}`];
let stackStarted=false;
let container='';
const restoreDb='rcsca_restore_rehearsal';

function run(command,commandArgs,{capture=false,cwd=projectRoot,input}={}){
  const result=spawnSync(command,commandArgs,{cwd,encoding:'utf8',stdio:capture?'pipe':'inherit',input,timeout:180000,maxBuffer:16*1024*1024});
  if(result.error||result.status!==0){
    if(capture){process.stderr.write(result.stdout||'');process.stderr.write(result.stderr||'');}
    throw result.error||Error(`${command} exited with ${result.status}`);
  }
  return result.stdout?.trim()||'';
}
function commandExists(command){const r=spawnSync(command,['--version'],{stdio:'ignore'});return !r.error;}
function dockerSql(database,query){return run('docker',['exec','-i',container,'psql','-X','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-At'],{capture:true,input:query});}
function dockerStream(commandArgs){
  const child=spawn('docker',['exec','-i',container,...commandArgs],{stdio:['pipe','pipe','pipe']});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>1024*1024)stderr=stderr.slice(-1024*1024);});
  child.stdout.resume();
  const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(`Isolated Production-origin restore failed. ${stderr.trim()}`)));});
  done.catch(()=>{});return {child,done};
}
function major(version){return String(version||'').match(/^\s*(\d+)/)?.[1]||'';}

try{
  if(!commandExists('docker'))throw Error('Docker is required for isolated restore rehearsal.');
  run('docker',['info'],{capture:true});

  // Authenticate every encrypted payload before any restore side effect.
  const verified=await verifyBundle(directory,key);
  const manifest=await readManifest(path.join(directory,'manifest.enc'),key);
  if(process.env.RCSCA_BACKUP_PROJECT_REF&&manifest.project_ref!==process.env.RCSCA_BACKUP_PROJECT_REF)throw Error('Backup project reference does not match the expected Production project.');

  run('npx',[...cli,'init','--workdir',workdir,'--yes']);
  run('npx',[...cli,'start','--workdir',workdir]);
  stackStarted=true;
  const config=fs.readFileSync(path.join(workdir,'supabase','config.toml'),'utf8');
  const projectId=config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if(!projectId)throw Error('Disposable Supabase project ID missing.');
  container=`supabase_db_${projectId}`;

  const localVersion=dockerSql('postgres','show server_version;');
  if(major(localVersion)!==major(manifest.database_version))throw Error(`PostgreSQL major mismatch: backup=${manifest.database_version}, rehearsal=${localVersion}. No restore-success claim was made.`);

  dockerSql('postgres',`drop database if exists ${restoreDb}; create database ${restoreDb} template template0;`);
  // template0 may include public; the Production dump owns the schema definition.
  dockerSql(restoreDb,'drop schema if exists public cascade;');

  const restored=dockerStream(['pg_restore','-U','postgres','-d',restoreDb,'--exit-on-error','--single-transaction','--no-owner','--no-privileges']);
  await unseal(path.join(directory,'database.enc'),key,restored.child.stdin);
  await restored.done;

  const schemas=JSON.parse(dockerSql(restoreDb,`select json_agg(nspname order by nspname) from pg_namespace where nspname in ('public','private','auth','storage');`));
  assert.deepEqual(schemas,['auth','private','public','storage'],'Required restored schemas are incomplete.');
  const restoredObjects=Number(dockerSql(restoreDb,'select count(*) from storage.objects;'));
  assert.equal(restoredObjects,manifest.objects.length,'Restored storage.objects inventory does not match encrypted manifest inventory.');

  const checks=JSON.parse(dockerSql(restoreDb,`select json_build_object(
    'profiles',to_regclass('public.profiles') is not null,
    'memberships',to_regclass('public.memberships') is not null,
    'point_transactions',to_regclass('public.point_transactions') is not null,
    'foreign_keys',(select count(*) from pg_constraint where contype='f'),
    'rls_tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relrowsecurity and n.nspname in ('public','private','auth','storage')),
    'policies',(select count(*) from pg_policy),
    'sequences',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='S' and n.nspname in ('public','private','auth','storage'))
  );`));
  if(!checks.profiles||!checks.memberships||!checks.point_transactions)throw Error('Core restored application tables are missing.');
  if(checks.foreign_keys<1||checks.rls_tables<1||checks.policies<1)throw Error('Restored database lost relational or RLS metadata.');

  // Re-authenticate/decrypt every Storage payload after the database restore as a second read pass.
  for(const item of manifest.objects){await unseal(path.join(directory,item.file),key,discard());}

  console.log(JSON.stringify({
    status:'production_origin_restore_rehearsal_passed',
    project_ref:manifest.project_ref,
    backup_created_at:manifest.created_at,
    backup_database_version:manifest.database_version,
    rehearsal_database_version:localVersion,
    restored_storage_objects:restoredObjects,
    checks,
    offsite_bundle_verified:true,
    production_origin_backup:true,
    isolated_restore:true,
    hosted_production_written:false,
    hosted_supabase_restore:false,
    note:'Database archive was restored into a disposable local Supabase PostgreSQL database; Storage payload bytes were authenticated but not rehydrated through the hosted Storage API.'
  }));
}finally{
  if(stackStarted){spawnSync('npx',[...cli,'stop','--workdir',workdir,'--no-backup'],{cwd:projectRoot,stdio:'inherit',timeout:180000});}
  await rm(workdir,{recursive:true,force:true});
  key.fill(0);
}

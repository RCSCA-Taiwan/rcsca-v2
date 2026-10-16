import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable,Writable} from 'node:stream';
import {seal,unseal,readKey,discard} from './archive.mjs';
import {verifyBundle,validateTarget,externalDirectory} from './run.mjs';
async function temporary(work){const dir=await mkdtemp(path.join(tmpdir(),'rcsca-backup-test-'));try{await work(dir);}finally{await rm(dir,{recursive:true,force:true});}}
const key=randomBytes(32);
test('binary data across many chunks round trips without plaintext files',()=>temporary(async dir=>{
 const payload=randomBytes(1024*1024+17),file=path.join(dir,'payload.enc');
 const sealed=await seal(Readable.from([payload.subarray(0,13),payload.subarray(13)]),file,key);
 const received=[];const verified=await unseal(file,key,new Writable({write(chunk,_encoding,done){received.push(chunk);done();}}));
 assert.deepEqual(verified,sealed);assert.deepEqual(Buffer.concat(received),payload);
 assert.notDeepEqual((await readFile(file)).subarray(0,20),payload.subarray(0,20));
}));
test('empty storage object can be authenticated',()=>temporary(async dir=>{const f=path.join(dir,'empty.enc');const expected=await seal(Readable.from([]),f,key);assert.deepEqual(await unseal(f,key,discard()),expected);}));
test('wrong key, ciphertext tampering, and truncation all fail authentication',()=>temporary(async dir=>{
 const f=path.join(dir,'data.enc');await seal(Readable.from(['private data']),f,key);
 await assert.rejects(unseal(f,randomBytes(32),discard()));
 const bytes=await readFile(f);bytes[21]^=1;await writeFile(f,bytes);await assert.rejects(unseal(f,key,discard()));
 await writeFile(f,bytes.subarray(0,35));await assert.rejects(unseal(f,key,discard()));
}));
test('payload creation never overwrites an earlier backup; symbolic links are refused',()=>temporary(async dir=>{
 const f=path.join(dir,'original.enc');await seal(Readable.from(['original']),f,key);const before=await readFile(f);
 await assert.rejects(seal(Readable.from(['overwrite']),f,key));assert.deepEqual(await readFile(f),before);
 const link=path.join(dir,'link.enc');await symlink(f,link);await assert.rejects(unseal(link,key,discard()));
}));
test('bundle requires authenticated manifest, every object, matching hashes and completion record',()=>temporary(async dir=>{
 const db=await seal(Readable.from(['synthetic database']),path.join(dir,'database.enc'),key);
 const object=await seal(Readable.from(['synthetic image']),path.join(dir,'object-00000000.enc'),key);
 const manifest={format:'RCSCA-backup-v1',project_ref:'synthetic',created_at:'test',payloads:[{file:'database.enc',...db},{file:'object-00000000.enc',...object}],objects:[{file:'object-00000000.enc'}]};
 await seal(Readable.from([JSON.stringify(manifest)]),path.join(dir,'manifest.enc'),key);
 await assert.rejects(verifyBundle(dir,key));
 const manifest_sha256=createHash('sha256').update(await readFile(path.join(dir,'manifest.enc'))).digest('hex');
 await writeFile(path.join(dir,'COMPLETE.json'),JSON.stringify({manifest_sha256}));
 assert.equal((await verifyBundle(dir,key)).objects,1);
 await rm(path.join(dir,'object-00000000.enc'));await assert.rejects(verifyBundle(dir,key));
}));
test('authenticated manifest cannot select files outside the backup directory',()=>temporary(async dir=>{
 const manifest={format:'RCSCA-backup-v1',payloads:[{file:'../database.enc'}],objects:[]};
 await seal(Readable.from([JSON.stringify(manifest)]),path.join(dir,'manifest.enc'),key);
 await assert.rejects(verifyBundle(dir,key,{requireComplete:false}),/Invalid archive payload/);
}));
test('explicit project binding rejects another project and transaction poolers',()=>{
 const ref='zoogppmgajbiridffohm',env={RCSCA_BACKUP_PROJECT_REF:ref,PGHOST:`db.${ref}.supabase.co`,PGUSER:'postgres',PGPORT:'5432',PGDATABASE:'postgres'};
 assert.doesNotThrow(()=>validateTarget(env));
 assert.throws(()=>validateTarget({...env,PGHOST:'db.skznlreavgipfhyapzjr.supabase.co'}));
 assert.throws(()=>validateTarget({...env,PGPORT:'6543'}));
 assert.throws(()=>validateTarget({...env,PGHOST:'aws-0-ap-southeast-1.pooler.supabase.com',PGUSER:'postgres.skznlreavgipfhyapzjr'}));
});
test('key must be exactly a canonical 32-byte random-key encoding',()=>{assert.deepEqual(readKey(key.toString('base64')),key);for(const invalid of [undefined,'password',randomBytes(16).toString('base64')])assert.throws(()=>readKey(invalid));});
test('output inside the source checkout is rejected',async()=>{await assert.rejects(externalDirectory(path.resolve('scripts/backup')),/source checkout/);});

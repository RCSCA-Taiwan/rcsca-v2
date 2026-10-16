import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {open,stat,lstat} from 'node:fs/promises';
import {Transform,Writable,Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const MAGIC=Buffer.from('RCSCABK1');
export function readKey(value){
 if(!value||!/^[A-Za-z0-9+/]{43}=$/.test(value))throw Error('RCSCA_BACKUP_KEY must be a base64-encoded random 32-byte key.');
 const key=Buffer.from(value,'base64');
 if(key.length!==32||key.toString('base64')!==value)throw Error('Invalid backup key.');
 return key;
}
export async function seal(source,path,key){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),hash=createHash('sha256');
 let bytes=0;
 const meter=new Transform({transform(chunk,_encoding,done){hash.update(chunk);bytes+=chunk.length;done(null,chunk);}});
 const envelope=new Transform({
  construct(done){this.push(Buffer.concat([MAGIC,iv]));done();},
  transform(chunk,_encoding,done){done(null,chunk);},
  flush(done){this.push(cipher.getAuthTag());done();}
 });
 // Exclusive creation prevents overwriting a backup or following an existing link.
 await pipeline(source,meter,cipher,envelope,createWriteStream(path,{flags:'wx',mode:0o600}));
 const handle=await open(path,'r+');try{await handle.sync();}finally{await handle.close();}
 return {bytes,sha256:hash.digest('hex')};
}
export async function unseal(path,key,destination){
 if(!(await lstat(path)).isFile())throw Error('Backup payload must be a regular file.');
 const {size}=await stat(path);
 if(size<36)throw Error('Truncated backup payload.');
 const handle=await open(path,'r');
 const header=Buffer.alloc(20),tag=Buffer.alloc(16);
 try{await handle.read(header,0,20,0);await handle.read(tag,0,16,size-16);}finally{await handle.close();}
 if(!header.subarray(0,8).equals(MAGIC))throw Error('Unknown backup format.');
 const decipher=createDecipheriv('aes-256-gcm',key,header.subarray(8));decipher.setAuthTag(tag);
 const hash=createHash('sha256');let bytes=0;
 const meter=new Transform({transform(chunk,_encoding,done){hash.update(chunk);bytes+=chunk.length;done(null,chunk);}});
 // Decrypted output is trusted only after the whole pipeline authenticates.
 await pipeline(size===36?Readable.from([]):createReadStream(path,{start:20,end:size-17}),decipher,meter,destination);
 return {bytes,sha256:hash.digest('hex')};
}
export function discard(){return new Writable({write(_chunk,_encoding,done){done();}});}
export async function readManifest(path,key){
 const chunks=[];let bytes=0;
 await unseal(path,key,new Writable({write(chunk,_encoding,done){bytes+=chunk.length;if(bytes>16*1024*1024)return done(Error('Manifest exceeds supported size.'));chunks.push(chunk);done();}}));
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

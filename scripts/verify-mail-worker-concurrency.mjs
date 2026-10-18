import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
const container=process.argv[2];
if(!container?.startsWith('supabase_db_rcsca-canonical-replay-'))throw Error('Only the disposable replay database is supported');
const args=['exec','-i',container,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'];
const token=randomBytes(32).toString('hex');
function sql(input){const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:15000});if(r.error||r.status!==0)throw Error('Worker race SQL failed');return r.stdout.trim();}
function session(input){
 const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});const value={child,out:'',code:undefined};
 child.stdout.on('data',v=>{value.out+=v;});child.stderr.resume();child.on('error',()=>{value.code=-1;});child.on('close',code=>{value.code=code;});
 child.stdin.write(input);return value;
}
async function until(predicate){const deadline=Date.now()+10000;while(Date.now()<deadline){if(predicate())return;await new Promise(r=>setTimeout(r,100));}throw Error('Worker race checkpoint timed out');}
let first,second,runId;
try{
 sql(`update private.admin_mail_worker_config set token_hash=sha256(convert_to('${token}','UTF8')) where singleton;
 update private.admin_mail_control set automatic_enabled=true where singleton;`);
 first=session(`begin;set local application_name='rcsca_worker_first';select public.admin_mail_worker('${token}','begin');select 'WORKER_LOCK_HELD';\n`);
 await until(()=>first.out.includes('WORKER_LOCK_HELD'));
 runId=JSON.parse(first.out.split('\n').find(line=>line.startsWith('{'))).id;
 second=session(`begin;set local statement_timeout='15s';set local application_name='rcsca_worker_second';select public.admin_mail_worker('${token}','begin');commit;\n`);
 second.child.stdin.end();
 await until(()=>sql("select count(*) from pg_stat_activity where application_name='rcsca_worker_second' and wait_event_type='Lock'")==='1');
 first.child.stdin.end('commit;\n');await until(()=>first.code!==undefined&&second.code!==undefined);
 if(first.code!==0||second.code!==0||!second.out.includes('busy'))throw Error('Concurrent worker run was not rejected');
 if(sql("select count(*) from private.admin_mail_runs where state='running'")!=='1')throw Error('Duplicate worker runs');
 console.log('PASS: two independent worker sessions overlap; second waits then returns busy, exactly one durable running lease, no SMTP/network calls');
}finally{
 for(const value of [first,second])if(value&&value.code===undefined)value.child.kill();
 sql("select pg_terminate_backend(pid) from pg_stat_activity where application_name in ('rcsca_worker_first','rcsca_worker_second') and pid<>pg_backend_pid()");
 if(runId&&/^[a-f0-9-]{36}$/.test(runId))sql(`delete from private.admin_mail_runs where id='${runId}'`);
 sql('update private.admin_mail_control set automatic_enabled=false where singleton;update private.admin_mail_worker_config set token_hash=null,worker_seen_at=null where singleton');
}

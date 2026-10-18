import {spawn,spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const container=process.argv[2];
if(!container?.startsWith('supabase_db_rcsca-canonical-replay-'))throw new Error('Only the disposable replay database is supported');
const args=['exec','-i',container,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'];
const actor=randomUUID(),source=randomUUID();
function sql(input){const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:15000});if(r.error||r.status!==0)throw r.error||Error(r.stderr);return r.stdout.trim();}
function session(input){
 const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});
 const result={child,out:'',err:'',code:undefined};
 child.stdout.on('data',v=>{result.out+=v;});child.stderr.on('data',v=>{result.err+=v;});
 child.on('error',e=>{result.err+=e.message;result.code=-1;});child.on('close',code=>{result.code=code;});
 child.stdin.write(input);return result;
}
async function until(predicate){const deadline=Date.now()+10000;while(Date.now()<deadline){if(predicate())return;await new Promise(r=>setTimeout(r,100));}throw Error('Mail claim concurrency checkpoint timed out');}
const auth=`select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);set local role authenticated;`;
let first,second;
try{
 sql(`insert into auth.users(id,email,raw_user_meta_data) values('${actor}','mail-race-${actor}@example.invalid','{}');
 insert into public.admin_roles(user_id,role_key) values('${actor}','admin');
 insert into private.site_mail_routing(recipient_email) values('mail-concurrency@example.invalid') on conflict(singleton) do nothing;
 update private.admin_mail_control set manual_enabled=true where singleton;
 insert into public.enterprise_applications(id,requester_user_id,company_name,tax_id,contact_name,contact_email) values('${source}','${actor}','Synthetic mail concurrency','MAIL-${source}','Synthetic','mail@example.invalid');`);
 first=session(`begin;set local application_name='rcsca_mail_claim_first';${auth}select public.admin_mail_claim();select 'MAIL_CLAIM_LOCK_HELD';\n`);
 await until(()=>first.out.includes('MAIL_CLAIM_LOCK_HELD'));
 second=session(`begin;set local application_name='rcsca_mail_claim_second';${auth}select coalesce(public.admin_mail_claim()::text,'NO_CLAIM');commit;\n`);
 second.child.stdin.end();
 await until(()=>second.code!==undefined);
 if(second.code!==0||!second.out.includes('NO_CLAIM'))throw Error('Second sender claimed a locked notification');
 first.child.stdin.end('commit;\n');await until(()=>first.code!==undefined);
 if(first.code!==0)throw Error('First sender claim failed');
 const actual=sql(`select count(*) from private.admin_mail_attempts a join private.admin_mail_outbox o on o.id=a.outbox_id where o.source_id='${source}';`);
 if(actual!=='1')throw Error('Concurrent claims created duplicate attempts');
 console.log('PASS: two independent sender sessions overlap; second skips locked notification, one durable attempt, no SMTP sending');
}finally{
 for(const value of [first,second])if(value&&value.code===undefined)value.child.kill();
 sql(`select pg_terminate_backend(pid) from pg_stat_activity where application_name in ('rcsca_mail_claim_first','rcsca_mail_claim_second') and pid<>pg_backend_pid();
 delete from private.admin_mail_actions where outbox_id in(select id from private.admin_mail_outbox where source_id='${source}');
 delete from private.admin_mail_attempts where outbox_id in(select id from private.admin_mail_outbox where source_id='${source}');
 delete from private.admin_mail_outbox where source_id='${source}';
 delete from public.enterprise_applications where id='${source}';delete from auth.users where id='${actor}';
 update private.admin_mail_control set manual_enabled=false where singleton;
 delete from private.site_mail_routing where recipient_email='mail-concurrency@example.invalid';`);
}

import {createHmac,timingSafeEqual} from 'node:crypto';
const path='/api/internal/admin-mail/run';
export function signedMailTick(env,headers,now=Date.now()){
 const secret=env.RCSCA_MAIL_WORKER_SECRET;
 if(env.VERCEL_ENV!=='production'||typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))return null;
 const time=headers.get('x-rcsca-mail-time'),nonce=headers.get('x-rcsca-mail-nonce'),mode=headers.get('x-rcsca-mail-mode'),signature=headers.get('x-rcsca-mail-signature');
 if(!time||!/^\d{10}$/.test(time)||!nonce||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(nonce)||!['verify','run'].includes(mode)||!signature||!/^[a-f0-9]{64}$/.test(signature))return null;
 const seconds=Number(time);
 if(seconds>Math.floor(now/1000)+30||seconds<Math.floor(now/1000)-120)return null;
 const expected=createHmac('sha256',secret).update(`POST\n${path}\n${time}\n${nonce}\n${mode}`).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))return null;
 return {nonce,seconds,verification:mode==='verify'};
}

export function signedMailTick(env:Record<string,string|undefined>,headers:Headers,now?:number):{nonce:string;seconds:number;verification:boolean}|null;

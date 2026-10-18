import type {reviewMailMessage} from './admin-mail-outbox.mjs';
type Env=Record<string,string|undefined>;
type Result={data:any;error:unknown};
type ReviewTransport={sendMail(message:NonNullable<ReturnType<typeof reviewMailMessage>>):Promise<{accepted?:unknown[]}>;close():void};
export function workerAuthorized(env:Env,header:string|null):boolean;
export function runMailWorker(env:Env,rpc:(args:Record<string,unknown>)=>PromiseLike<Result>,makeTransport:(config:any)=>ReviewTransport):Promise<{state:string;processed:number}>;

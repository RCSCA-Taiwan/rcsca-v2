export const reviewMailKinds:Record<string,[string,string]>;
export function reviewMailMessage(config:{from:string},claim:unknown):{from:string;to:string;subject:string;text:string;messageId:string}|null;
export function reviewMailFailure(error:unknown):{outcome:'failed'|'unknown';failure:'authentication_failed'|'connection_timeout'|'connection_failed'|'tls_failed'|'rejected'|'unconfirmed'};
export function deliverReviewClaim(config:{from:string},claim:unknown,transport:{sendMail(message:NonNullable<ReturnType<typeof reviewMailMessage>>):Promise<{accepted?:unknown[]}>;close():void},record:(outcome:string,failure:string|null)=>Promise<{error:unknown}>):Promise<string>;

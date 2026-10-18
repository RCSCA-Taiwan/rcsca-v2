export function adminMailFailureState(error:unknown):'authentication_failed'|'connection_timeout'|'connection_failed'|'tls_failed'|'verification_failed';
export function adminMailConfig(env:NodeJS.ProcessEnv):
  | {state:'not_configured'|'invalid'|'invalid_gmail_password'}
  | {state:'configured';host:string;port:number;user:string;pass:string;from:string};

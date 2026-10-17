export function adminMailConfig(env:NodeJS.ProcessEnv):
  | {state:'not_configured'|'invalid'}
  | {state:'configured';host:string;port:number;user:string;pass:string;from:string};

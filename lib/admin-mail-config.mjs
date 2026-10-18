// Server-only configuration. Never return the resulting credentials to a client.
// Map only known error codes to fixed labels; provider messages may contain secrets.
export function adminMailFailureState(error) {
  const code=error&&typeof error==='object'?error.code:undefined;
  if(code==='EAUTH')return 'authentication_failed';
  if(code==='ETIMEDOUT')return 'connection_timeout';
  if(['ENOTFOUND','EAI_AGAIN','ECONNECTION','ECONNREFUSED','ECONNRESET'].includes(code))return 'connection_failed';
  if(['ETLS','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID'].includes(code))return 'tls_failed';
  return 'verification_failed';
}
export function adminMailConfig(env) {
  const user=env.RCSCA_SMTP_USER?.trim();
  let pass=env.RCSCA_SMTP_PASSWORD;
  if(!user||!pass)return {state:'not_configured'};
  const host=env.RCSCA_SMTP_HOST?.trim()||'smtp.gmail.com';
  const port=Number(env.RCSCA_SMTP_PORT||'587');
  const from=env.RCSCA_SMTP_FROM?.trim()||user;
  const address=/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if(!address.test(user)||!address.test(from)||user.length>254||from.length>254||
    !/^[a-zA-Z0-9.-]+$/.test(host)||!host.includes('.')||![465,587].includes(port))return {state:'invalid'};
  if(host.toLowerCase()==='smtp.gmail.com'){
    // Google presents app passwords in spaced groups. Mobile copying may also
    // include a line break or non-breaking space. Never change other providers.
    pass=pass.replace(/\s/gu,'');
    if(!/^[a-z]{16}$/.test(pass))return {state:'invalid_gmail_password'};
  }
  return {state:'configured',host,port,user,pass,from};
}

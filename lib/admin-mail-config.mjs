// Server-only configuration. Never return the resulting credentials to a client.
export function adminMailConfig(env) {
  const user=env.RCSCA_SMTP_USER?.trim();
  const pass=env.RCSCA_SMTP_PASSWORD;
  if(!user||!pass)return {state:'not_configured'};
  const host=env.RCSCA_SMTP_HOST?.trim()||'smtp.gmail.com';
  const port=Number(env.RCSCA_SMTP_PORT||'587');
  const from=env.RCSCA_SMTP_FROM?.trim()||user;
  const address=/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if(!address.test(user)||!address.test(from)||user.length>254||from.length>254||
    !/^[a-zA-Z0-9.-]+$/.test(host)||!host.includes('.')||![465,587].includes(port))return {state:'invalid'};
  return {state:'configured',host,port,user,pass,from};
}

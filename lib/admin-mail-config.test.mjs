import test from 'node:test';
import assert from 'node:assert/strict';
import {adminMailConfig,adminMailFailureState} from './admin-mail-config.mjs';
test('SMTP diagnostics disclose only fixed failure categories, never provider text',()=>{
  const privateText='synthetic-password-and-private-address@example.test';
  for(const [code,state] of [['EAUTH','authentication_failed'],['ETIMEDOUT','connection_timeout'],['ENOTFOUND','connection_failed'],['ECONNREFUSED','connection_failed'],['ETLS','tls_failed'],['ERR_TLS_CERT_ALTNAME_INVALID','tls_failed'],[privateText,'verification_failed']]){
    assert.equal(adminMailFailureState({code,message:privateText,response:privateText,command:privateText}),state);
  }
  for(const error of [null,undefined,privateText,new Error(privateText),{responseCode:535,message:privateText}]){
    assert.equal(adminMailFailureState(error),'verification_failed');
  }
});
test('mail setup fails closed without both private credentials',()=>{
  assert.deepEqual(adminMailConfig({}),{state:'not_configured'});
  assert.deepEqual(adminMailConfig({RCSCA_SMTP_USER:'operator@example.test'}),{state:'not_configured'});
});
test('SMTP requires a supported encrypted transport and single mailbox addresses',()=>{
  const env={RCSCA_SMTP_USER:'operator@example.test',RCSCA_SMTP_PASSWORD:'abcdefghijklmnop'};
  assert.equal(adminMailConfig(env).state,'configured');
  for(const invalid of [{RCSCA_SMTP_PORT:'25'},{RCSCA_SMTP_USER:'a@example.test\r\nBcc:x@example.test'},{RCSCA_SMTP_FROM:'a@example.test,b@example.test'},{RCSCA_SMTP_HOST:'smtp://example.test'}]){
    assert.deepEqual(adminMailConfig({...env,...invalid}),{state:'invalid'});
  }
});
test('Gmail accepts copied group whitespace, rejects malformed secrets and leaves other providers unchanged',()=>{
  const env={RCSCA_SMTP_USER:'operator@example.test'};
  for(const pass of ['abcdefghijklmnop','abcd efgh ijkl mnop',' abcd\nefgh\r\nijkl\u00a0mnop ']){
    const result=adminMailConfig({...env,RCSCA_SMTP_PASSWORD:pass});
    assert.equal(result.state,'configured');
    assert.equal(result.pass,'abcdefghijklmnop');
  }
  for(const pass of ['RCSCA_SMTP_PASSWORD','RCSCA管理通知','abcdefghijklmno','abcdefghijklmnopq','"abcdefghijklmnop"','ABCD EFGH IJKL MNOP','abcd1234ijklmnop','abcdefghijklmnop\u200b']){
    assert.deepEqual(adminMailConfig({...env,RCSCA_SMTP_PASSWORD:pass}),{state:'invalid_gmail_password'});
  }
  const custom='synthetic secret with spaces';
  assert.equal(adminMailConfig({...env,RCSCA_SMTP_HOST:'smtp.example.test',RCSCA_SMTP_PASSWORD:custom}).pass,custom);
});

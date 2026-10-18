import test from 'node:test';
import assert from 'node:assert/strict';
import {adminMailConfig} from './admin-mail-config.mjs';
test('mail setup fails closed without both private credentials',()=>{
  assert.deepEqual(adminMailConfig({}),{state:'not_configured'});
  assert.deepEqual(adminMailConfig({RCSCA_SMTP_USER:'operator@example.test'}),{state:'not_configured'});
});
test('SMTP requires a supported encrypted transport and single mailbox addresses',()=>{
  const env={RCSCA_SMTP_USER:'operator@example.test',RCSCA_SMTP_PASSWORD:'synthetic-secret'};
  assert.equal(adminMailConfig(env).state,'configured');
  for(const invalid of [{RCSCA_SMTP_PORT:'25'},{RCSCA_SMTP_USER:'a@example.test\r\nBcc:x@example.test'},{RCSCA_SMTP_FROM:'a@example.test,b@example.test'},{RCSCA_SMTP_HOST:'smtp://example.test'}]){
    assert.deepEqual(adminMailConfig({...env,...invalid}),{state:'invalid'});
  }
});

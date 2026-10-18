import {expect,test} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

test('mail diagnostics reject unauthenticated and cross-origin requests',async({request,baseURL})=>{
  const read=await request.get('/api/admin/mail');
  expect(read.status()).toBe(401);
  expect(read.headers()['cache-control']).toContain('no-store');
  expect((await request.get('/api/admin/mail/outbox')).status()).toBe(401);
  expect((await request.post('/api/admin/mail/outbox',{headers:{Origin:new URL(baseURL!).origin},data:{action:'send_next'}})).status()).toBe(401);
  expect((await request.post('/api/admin/mail/outbox',{headers:{Origin:'https://example.test'},data:{action:'send_next'}})).status()).toBe(403);
  const verify=await request.post('/api/admin/mail',{headers:{Origin:new URL(baseURL!).origin}});
  expect(verify.status()).toBe(401);
  expect((await request.post('/api/admin/mail',{headers:{Origin:new URL(baseURL!).origin,'X-RCSCA-Mail-Action':'send_test'}})).status()).toBe(401);
  const foreign=await request.post('/api/admin/mail',{headers:{Origin:'https://example.test'}});
  expect(foreign.status()).toBe(403);
  const wrongPort=new URL(baseURL!);wrongPort.port=String(Number(wrongPort.port||80)+1);
  expect((await request.post('/api/admin/mail',{headers:{Origin:wrongPort.origin}})).status()).toBe(403);
  expect((await request.post('/api/admin/mail')).status()).toBe(403);
  expect(await read.json()).toEqual({state:'unavailable'});
});

test('ordinary members cannot inspect or verify private SMTP configuration',async({request,baseURL})=>{
  test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await client.auth.signInWithPassword({email:process.env.RCSCA_E2E_EMAIL!,password:process.env.RCSCA_E2E_PASSWORD!});
  expect(result.error).toBeNull();
  const headers={Authorization:`Bearer ${result.data.session!.access_token}`,Origin:new URL(baseURL!).origin};
  for(const method of ['get','post'] as const){
    const response=await request[method]('/api/admin/mail',{headers});
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({state:'unavailable'});
  }
  const send=await request.post('/api/admin/mail',{headers:{...headers,'X-RCSCA-Mail-Action':'send_test'}});
  expect(send.status()).toBe(403);
  expect(await send.json()).toEqual({state:'unavailable'});
  expect((await request.get('/api/admin/mail/outbox',{headers})).status()).toBe(403);
  for(const action of [{action:'send_next'},{action:'set_manual',enabled:true,receipt_confirmed:true},{action:'retry',id:'10c95f11-60c1-4e1a-bfd9-121a80043114',duplicate_checked:true}]){
    expect((await request.post('/api/admin/mail/outbox',{headers,data:action})).status()).toBe(403);
  }
});

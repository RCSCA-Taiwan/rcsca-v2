import {expect,test,type Page} from '@playwright/test';

async function login(page:Page,path:string){
 await page.goto(`/login?next=${encodeURIComponent(path)}`);
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(path+'$'));
}

test('identity keeps readable qualifications and recovers unknown membership without presenting it as absent',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 let phase:'partial'|'active'|'empty'='partial';
 for(const table of ['memberships','identity_verifications','enterprise_users']){
  await page.route(`**/rest/v1/${table}?**`,async route=>{
   expect(new URL(route.request().url()).searchParams.get('user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);
   const failed=phase==='partial'&&table==='memberships';
   const data=phase==='empty'?null:table==='memberships'?{membership_type:'annual',status:'active',member_since:'2018-01-07',member_number:'SYNTHETIC-IDENTITY'}:table==='identity_verifications'?{status:'pending'}:{enterprise_id:'15500000-0000-4000-8000-000000005501'};
   await route.fulfill({status:failed?403:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic read rejection'}:data)});
  });
 }
 await login(page,'/account/identity');
 const panel=page.locator('.identityWorkspace'),cards=panel.locator('.liveIdentity>div');
 await expect(panel.getByRole('alert')).toContainText('部分身份資料目前無法讀取');
 await expect(cards.nth(0).locator('strong')).toHaveText('尚未確認');
 await expect(cards.nth(2).locator('strong')).toHaveText('尚未確認');
 await expect(cards.nth(1).locator('strong')).toHaveText('審核中');
 await expect(cards.nth(3).getByRole('link')).toHaveAttribute('href','/1percent-partner/dashboard');
 const routes=panel.getByRole('navigation',{name:'身份與申請入口',exact:true});
 await expect(routes.getByRole('link',{name:'入會／續會與審核進度 →',exact:true})).toBeVisible();
 phase='active';await panel.getByRole('button',{name:'重新讀取身份',exact:true}).click();
 await expect(panel.getByRole('alert')).toHaveCount(0);
 await expect(cards.nth(0).locator('strong')).toHaveText('RCSCA會員');
 await expect(cards.nth(2)).toContainText('2018-01-07');
 await expect(panel.getByText('SYNTHETIC-IDENTITY',{exact:true})).toBeVisible();
 phase='empty';await panel.getByRole('button',{name:'重新讀取身份',exact:true}).click();
 await expect(cards.nth(0).locator('strong')).toHaveText('共享夥伴');
 await expect(cards.nth(2).locator('strong')).toHaveText('無');
 await expect(cards.nth(1).locator('strong')).toHaveText('尚未提出');
 await expect(panel.getByText('SYNTHETIC-IDENTITY',{exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await routes.getByRole('link',{name:'入會／續會與審核進度 →',exact:true}).click();
 await expect(page).toHaveURL(/\/membership\/apply$/);
});

test('verification retries unreadable progress, preserves rejected input and prevents overlapping submissions',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 let readFailed=true,status='rejected',writes=0,rejectWrite=true,release=()=>{};
 await page.route('**/rest/v1/identity_verifications?**',async route=>{
  expect(new URL(route.request().url()).searchParams.get('user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);
  await route.fulfill({status:readFailed?403:200,contentType:'application/json',body:JSON.stringify(readFailed?{message:'Synthetic read rejection'}:{status,verification_kind:'basic_identity'})});
 });
 await page.route('**/rest/v1/rpc/request_identity_verification',async route=>{
  writes++;expect(route.request().postDataJSON()).toMatchObject({p_verification_kind:'basic_identity',p_identity_token:'SYNTHETIC-NOT-AN-ID'});
  if(rejectWrite){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Synthetic write rejection'})});return;}
  await new Promise<void>(resolve=>{release=resolve;});
  readFailed=true;status='pending';
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify('15500000-0000-4000-8000-000000005502')});
 });
 await login(page,'/account/identity/verify');
 const panel=page.locator('.identityVerification');
 await expect(panel.getByRole('alert')).toHaveText('目前無法確認驗證進度，請重新讀取後再送出。');
 await expect(panel.getByRole('form')).toHaveCount(0);
 readFailed=false;await panel.getByRole('button',{name:'重新讀取驗證進度',exact:true}).click();
 const form=panel.getByRole('form',{name:'身份驗證',exact:true});
 await expect(form.getByText('未通過',{exact:true})).toBeVisible();
 const token=form.getByLabel('識別碼（需要比對時才填）',{exact:true});
 await token.fill('SYNTHETIC-NOT-AN-ID');
 await form.getByRole('button',{name:'送出驗證申請 →',exact:true}).click();
 await expect(panel.getByRole('alert')).toHaveText('送出失敗，請稍後再試。');
 await expect(token).toHaveValue('SYNTHETIC-NOT-AN-ID');
 rejectWrite=false;await form.getByRole('button',{name:'送出驗證申請 →',exact:true}).click();
 try{
  await expect.poll(()=>writes).toBe(2);
  await expect(token).toBeDisabled();
  await form.dispatchEvent('submit');
  expect(writes).toBe(2);
 }finally{release();}
 await expect(panel.getByRole('alert')).toHaveText('目前無法確認驗證進度，請重新讀取後再送出。');
 await expect(panel.getByRole('status')).toHaveText('已送出驗證申請。原始識別碼不會保存在這個流程中。');
 readFailed=false;status='verified';await panel.getByRole('button',{name:'重新讀取驗證進度',exact:true}).click();
 await expect(form.getByRole('button',{name:'已完成驗證',exact:true})).toBeDisabled();
 await expect(token).toHaveValue('');
 await form.dispatchEvent('submit');expect(writes).toBe(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await panel.getByRole('link',{name:'回到身份與使用權限 →',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/identity$/);
});

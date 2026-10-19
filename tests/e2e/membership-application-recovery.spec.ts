import {expect,test} from '@playwright/test';

test('membership progress survives partial failure, preserves a draft and separates accepted submission from unreadable results',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 let detailsFailed=true,progressFailed=false,submitted=false,writes=0,birthday='1990-02-28',release=()=>{};
 const row={id:'15500000-0000-4000-8000-000000005801',application_kind:'new',membership_type:'annual',full_name:'合成原申請姓名',identity_mask:'A******789',phone:'0900000000',email:'test@example.invalid',address:'合成通訊地址',status:'needs_info',review_note:'請確認聯絡資料',created_at:'2026-10-19T01:00:00Z'};
 await page.route('**/rest/v1/rpc/membership_applications_self',r=>r.fulfill({status:progressFailed?403:200,contentType:'application/json',body:JSON.stringify(progressFailed?{message:'Synthetic progress rejection'}:[submitted?{...row,full_name:'合成修改姓名',status:'pending',review_note:null}:row])}));
 await page.route('**/rest/v1/memberships?**',async r=>{
  expect(new URL(r.request().url()).searchParams.get('user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);
  await r.fulfill({contentType:'application/json',body:'null'});
 });
 await page.route('**/rest/v1/rpc/member_history_self',r=>r.fulfill({status:detailsFailed?403:200,contentType:'application/json',body:JSON.stringify(detailsFailed?{message:'Synthetic birthday rejection'}:{birth_date:birthday,greetings_consent:false,membership_type:null,membership_status:null,member_since:null,years:null,claim:null})}));
 await page.route('**/rest/v1/rpc/membership_submit_with_birthday',async r=>{
  writes++;expect(r.request().postDataJSON()).toMatchObject({p_name:'合成修改姓名',p_identity:'A123456789',p_birth_date:'1990-02-28',p_consent:true});
  await new Promise<void>(resolve=>{release=resolve;});
  submitted=true;progressFailed=true;birthday='1990-02-28';
  await r.fulfill({contentType:'application/json',body:JSON.stringify(row.id)});
 });
 await page.goto('/login?next=%2Fmembership%2Fapply');
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/membership\/apply$/);
 const panel=page.locator('.membershipApplicationWorkspace'),retry=panel.getByRole('button',{name:'重新讀取申請進度',exact:true});
 await expect(panel.getByRole('alert')).toContainText('申請進度已讀取');
 await expect(panel.getByText('審核備註：請確認聯絡資料',{exact:true})).toBeVisible();
 await expect(panel.getByRole('form')).toHaveCount(0);
 detailsFailed=false;progressFailed=true;await retry.click();
 await expect(panel.getByRole('alert')).toHaveText('目前無法確認申請進度，請重新讀取後再送出。');
 await expect(panel.getByText('目前沒有申請紀錄。',{exact:true})).toHaveCount(0);
 await expect(panel.getByRole('form')).toHaveCount(0);
 await expect(panel.getByRole('navigation',{name:'會員申請後續操作',exact:true})).toBeVisible();
 progressFailed=false;await retry.click();
 const form=panel.getByRole('form',{name:'入會與續會申請',exact:true});
 await expect(form.getByLabel('姓名＊',{exact:true})).toHaveValue(row.full_name);
 const progressBox=await panel.getByRole('region',{name:'申請進度',exact:true}).boundingBox(),formBox=await form.boundingBox();
 expect(progressBox&&formBox&&progressBox.y+progressBox.height<=formBox.y).toBeTruthy();
 await form.getByLabel('姓名＊',{exact:true}).fill('合成修改姓名');
 await form.getByLabel('身分證字號＊',{exact:true}).fill('A123456789');
 await form.getByRole('checkbox',{name:/我同意協會/}).check();
 birthday='1991-03-01';await retry.click();
 await expect(form.getByLabel('姓名＊',{exact:true})).toHaveValue('合成修改姓名');
 await expect(form.getByLabel('生日＊',{exact:true})).toHaveValue('1990-02-28');
 await expect(form.getByLabel('身分證字號＊',{exact:true})).toHaveValue('A123456789');
 await expect(form.getByRole('checkbox',{name:/我同意協會/})).toBeChecked();
 await form.getByRole('button',{name:'送出申請',exact:true}).click();
 try{
  await expect.poll(()=>writes).toBe(1);
  await expect(form.getByLabel('姓名＊',{exact:true})).toBeDisabled();
  await form.dispatchEvent('submit');expect(writes).toBe(1);
 }finally{release();}
 await expect(panel.getByRole('alert')).toHaveText('目前無法確認申請進度，請重新讀取後再送出。');
 await expect(panel.locator('.workflowNotice[role="status"]')).toContainText('申請已送出');
 await expect(panel.getByText('目前沒有申請紀錄。',{exact:true})).toHaveCount(0);
 await expect(panel.getByRole('form')).toHaveCount(0);
 progressFailed=false;await retry.click();
 await expect(panel.getByText('待審核',{exact:true})).toBeVisible();
 await expect(form.getByRole('button',{name:'送出申請',exact:true})).toBeDisabled();
 await expect(form.getByLabel('身分證字號＊',{exact:true})).toHaveValue('');
 await form.dispatchEvent('submit');expect(writes).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

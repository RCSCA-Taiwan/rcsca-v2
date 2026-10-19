import {expect,test} from '@playwright/test';

test('historical claim survives reload, recovers failed reads and permits a reviewed correction without duplicate writes',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 let status:'pending'|'approved'|'rejected'='pending',readFailed=false,writes=0,rejectWrite=true,release=()=>{};
 await page.route('**/rest/v1/rpc/member_history_self',async route=>{
  expect(route.request().postDataJSON()).toEqual({});
  await route.fulfill({status:readFailed?403:200,contentType:'application/json',body:JSON.stringify(readFailed?{message:'Synthetic read rejection'}:{birth_date:null,greetings_consent:false,membership_type:status==='approved'?'lifetime':null,membership_status:status==='approved'?'active':null,member_since:status==='approved'?'2018-03-01':null,years:null,claim:{status,review_note:status==='rejected'?'請核對原名冊電話':null}})});
 });
 await page.route('**/rest/v1/rpc/legacy_member_claim',async route=>{
  writes++;expect(route.request().postDataJSON()).toMatchObject({p_name:'合成認領會員',p_phone:'0912345678',p_identity:'',p_consent:true});
  if(rejectWrite){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Synthetic write rejection'})});return;}
  await new Promise<void>(resolve=>{release=resolve;});status='pending';
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify('15500000-0000-4000-8000-000000005701')});
 });
 await page.goto('/login?next=%2Fmembership%2Fclaim');
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/membership\/claim$/);
 const panel=page.locator('.legacyClaimWorkspace');
 await expect(panel.getByRole('heading',{name:'認領進度：待協會核對',exact:true})).toBeVisible();
 await expect(panel.getByRole('form')).toHaveCount(0);
 await page.reload();
 await expect(panel.getByRole('heading',{name:'認領進度：待協會核對',exact:true})).toBeVisible();
 readFailed=true;await panel.getByRole('button',{name:'重新讀取認領進度',exact:true}).click();
 await expect(panel.getByRole('alert')).toHaveText('目前無法確認認領進度，請重新讀取後再送出。');
 await expect(panel.getByRole('form')).toHaveCount(0);
 await expect(panel.getByRole('navigation',{name:'會籍與認領後續操作',exact:true})).toBeVisible();
 readFailed=false;status='rejected';await panel.getByRole('button',{name:'重新讀取認領進度',exact:true}).click();
 await expect(panel.getByText('審核備註：請核對原名冊電話',{exact:true})).toBeVisible();
 const form=panel.getByRole('form',{name:'歷年會員認領申請',exact:true});
 await form.getByLabel('會員姓名＊',{exact:true}).fill('合成認領會員');
 await form.getByLabel('舊名冊電話',{exact:true}).fill('0912345678');
 await form.getByRole('checkbox',{name:/我確認為本人/}).check();
 await form.getByRole('button',{name:'送出認領申請',exact:true}).click();
 await expect(panel.getByRole('alert')).toContainText('操作未完成');
 await expect(form.getByLabel('會員姓名＊',{exact:true})).toHaveValue('合成認領會員');
 await expect(form.getByLabel('舊名冊電話',{exact:true})).toHaveValue('0912345678');
 rejectWrite=false;await form.getByRole('button',{name:'送出認領申請',exact:true}).click();
 try{
  await expect.poll(()=>writes).toBe(2);
  await expect(form.getByLabel('舊名冊電話',{exact:true})).toBeDisabled();
  await form.dispatchEvent('submit');expect(writes).toBe(2);
 }finally{release();}
 await expect(panel.getByRole('status')).toContainText('認領申請已送出');
 await expect(panel.getByRole('form')).toHaveCount(0);
 status='approved';await page.reload();
 await expect(panel.getByRole('heading',{name:'認領進度：已核准',exact:true})).toBeVisible();
 await expect(panel.getByText('原始入會日期：2018-03-01',{exact:true})).toBeVisible();
 await expect(panel.getByRole('form')).toHaveCount(0);
 expect(writes).toBe(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await panel.getByRole('link',{name:'查看會籍、年資與生日資料 →',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/profile$/);
});

import {expect,test,type Page} from '@playwright/test';
async function login(page:Page){
 await page.goto('/login?next=%2Faccount%2Fdata-requests');
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/data-requests$/);
}
const row={id:'16600000-0000-4000-8000-000000006001',request_kind:'edit',requested_changes:{display_name:'合成修改姓名'},reason:'合成資料修改原因',status:'submitted',review_note:null as string|null,created_at:'2026-10-19T01:00:00Z'};

test('data request recovers unreadable progress, preserves input, separates accepted submission and stops stale supplementation',async({page})=>{
 test.setTimeout(60000);test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 let read:'malformed'|'failed'|'ready'='malformed',rows:typeof row[]=[],writes=0,release=()=>{};
 await page.route('**/rest/v1/rpc/personal_data_requests_self',r=>r.fulfill({status:read==='failed'?403:200,contentType:'application/json',body:JSON.stringify(read==='failed'?{message:'Synthetic rejection'}:read==='malformed'?null:rows)}));
 await page.route('**/rest/v1/rpc/personal_data_request_submit',async r=>{
  writes++;expect(r.request().postDataJSON()).toEqual({p_kind:'edit',p_changes:{display_name:'合成修改姓名'},p_reason:row.reason,p_confirm_one:false,p_confirm_two:false,p_request:null});
  if(writes===1){await new Promise<void>(resolve=>{release=resolve;});await r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Synthetic write rejection'})});return;}
  rows=[{...row}];read='failed';await r.fulfill({contentType:'application/json',body:JSON.stringify(row.id)});
 });
 await login(page);const panel=page.locator('.dataRequestWorkspace'),form=panel.getByRole('form',{name:'個人資料申請',exact:true}),retry=panel.getByRole('button',{name:'重新讀取資料申請進度',exact:true});
 await expect(panel.getByRole('alert')).toContainText('目前無法讀取申請紀錄');await expect(form).toHaveCount(0);await expect(panel.getByText('目前沒有資料申請。',{exact:true})).toHaveCount(0);
 await expect(panel.getByRole('navigation',{name:'資料申請後續操作',exact:true})).toBeVisible();
 read='ready';await retry.click();await expect(panel.getByText('目前沒有資料申請。',{exact:true})).toBeVisible();
 await form.getByLabel('姓名／顯示名稱',{exact:true}).fill('合成修改姓名');await form.getByLabel('申請原因或補充說明＊',{exact:true}).fill(row.reason);
 read='failed';await retry.click();await expect(panel.getByRole('alert')).toBeVisible();await expect(form).toHaveCount(0);
 read='ready';await retry.click();await expect(form.getByLabel('姓名／顯示名稱',{exact:true})).toHaveValue('合成修改姓名');
 await expect(form.getByLabel('申請原因或補充說明＊',{exact:true})).toHaveValue(row.reason);
 await form.getByRole('button',{name:'送出資料修改申請',exact:true}).click();
 try{await expect.poll(()=>writes).toBe(1);await expect(form.getByLabel('申請項目',{exact:true})).toBeDisabled();await expect(retry).toBeDisabled();await form.dispatchEvent('submit');expect(writes).toBe(1);}finally{release();}
 await expect(panel.getByRole('alert')).toContainText('操作未完成');await expect(form.getByLabel('姓名／顯示名稱',{exact:true})).toHaveValue('合成修改姓名');
 await form.getByRole('button',{name:'送出資料修改申請',exact:true}).click();
 await expect(panel.getByRole('status').filter({hasText:'申請已送出'})).toBeVisible();await expect(panel.getByRole('alert')).toContainText('目前無法讀取申請紀錄');await expect(form).toHaveCount(0);expect(writes).toBe(2);
 read='ready';await retry.click();await expect(panel.getByText('待審核',{exact:true})).toBeVisible();await expect(form).toHaveCount(0);
 rows=[{...row,status:'needs_info',review_note:'請補充聯絡方式'}];await retry.click();await expect(panel.getByText('協會回覆：請補充聯絡方式',{exact:true})).toBeVisible();
 await panel.getByRole('button',{name:'補充資料',exact:true}).click();await expect(form.getByLabel('申請原因或補充說明＊',{exact:true})).toHaveValue(row.reason);
 await form.getByLabel('申請原因或補充說明＊',{exact:true}).fill('合成補件內容');await retry.click();await expect(form.getByLabel('申請原因或補充說明＊',{exact:true})).toHaveValue('合成補件內容');
 rows=[{...row,status:'approved',review_note:'已完成審核，等待處理'}];await retry.click();await expect(panel.getByText('已核准，待處理',{exact:true})).toBeVisible();
 await expect(form).toHaveCount(0);await expect(panel.getByRole('status').filter({hasText:'原申請狀態已更新'})).toBeVisible();expect(writes).toBe(2);
 await panel.getByRole('button',{name:'返回最新申請進度',exact:true}).click();await expect(form).toHaveCount(0);
 rows=[{...row,status:'completed'}];await retry.click();await expect(form.getByLabel('姓名／顯示名稱',{exact:true})).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('withdrawing a data request preserves failed edits and prevents duplicate cancellation even when readback fails',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 let failed=false,cancels=0,release=()=>{},rows:typeof row[]=[{...row,status:'needs_info',review_note:'補充合成說明'}];
 await page.route('**/rest/v1/rpc/personal_data_requests_self',r=>r.fulfill({status:failed?403:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic read rejection'}:rows)}));
 await page.route('**/rest/v1/rpc/personal_data_request_cancel',async r=>{
  cancels++;expect(r.request().postDataJSON()).toEqual({p_request:row.id});
  if(cancels===1){await new Promise<void>(resolve=>{release=resolve;});await r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Synthetic cancellation rejection'})});return;}
  rows=[{...row,status:'cancelled',review_note:null}];failed=true;await r.fulfill({status:204,body:''});
 });
 await login(page);const panel=page.locator('.dataRequestWorkspace'),form=panel.getByRole('form',{name:'個人資料申請',exact:true}),cancel=panel.getByRole('button',{name:'撤回申請',exact:true});
 await panel.getByRole('button',{name:'補充資料',exact:true}).click();await form.getByLabel('申請原因或補充說明＊',{exact:true}).fill('尚未送出的補件');
 await cancel.click();try{await expect.poll(()=>cancels).toBe(1);await expect(cancel).toBeDisabled();await cancel.dispatchEvent('click');expect(cancels).toBe(1);}finally{release();}
 await expect(panel.getByRole('alert')).toContainText('操作未完成');await expect(form.getByLabel('申請原因或補充說明＊',{exact:true})).toHaveValue('尚未送出的補件');
 await cancel.click();await expect(panel.getByRole('status').filter({hasText:'申請已撤回。'})).toBeVisible();await expect(panel.getByRole('alert')).toContainText('目前無法讀取申請紀錄');expect(cancels).toBe(2);
 failed=false;await panel.getByRole('button',{name:'重新讀取資料申請進度',exact:true}).click();await expect(panel.getByText('已撤回',{exact:true})).toBeVisible();
 await expect(form.getByLabel('申請原因或補充說明＊',{exact:true})).toHaveValue('');await expect(form.getByLabel('姓名／顯示名稱',{exact:true})).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

import {expect,test,type Page} from '@playwright/test';
const id='17700000-0000-4000-8000-000000006201';
const code={id,point_cost:7,status:'approved',points_expires_at:null,fulfillment_type:'code',redemption_code:'SYNTHETIC-ONLY',created_at:'2026-10-20T01:00:00Z',updated_at:'2026-10-20T01:00:00Z',reward_catalog:{title:'合成兌換碼紀錄'}};
const cancel={redemption_id:id,title:'合成可取消訂單',point_cost:7,redemption_status:'approved',fulfillment_type:'code',can_request:true,can_review:false,status:null as string|null,reason:null,review_note:null,points_expires_at:null,refunded_points:null,refunded_available:null};
const delivery={id:'17700000-0000-4000-8000-000000006202',reward_id:id,redemption_id:'17700000-0000-4000-8000-000000006202',title:'合成配送紀錄',fulfillment_type:'delivery',effective_state:'shipped',state:'shipped',redemption_status:'approved',point_cost:5,cancellation_pending:false,hold_until:null,slot_id:null,starts_at:null,ends_at:null,contact_name:'合成收件人',phone:'0900000000',destination_type:'home',postal_code:'100',address:'合成測試地址',shipping_policy:'free',shipping_note:'合成免運',carrier:'合成物流',tracking_number:'TEST-ONLY',provider_note:null,issue_note:null as string|null,issue_resolution:null,created_at:'2026-10-20T01:00:00Z'};
async function login(page:Page){
 await page.goto('/login?next=%2Faccount%2Fredemptions');await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page).toHaveURL(/\/account\/redemptions$/);
}
test.beforeEach(()=>{test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');});
test('redemption code failure stays unknown while readable delivery remains available, and retry recovers',async({page})=>{
 let mode=0;
 await page.route('**/rest/v1/reward_redemptions?**',r=>{expect(new URL(r.request().url()).searchParams.get('user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);return r.fulfill({status:mode===0?403:200,contentType:'application/json',body:JSON.stringify(mode===0?{message:'Synthetic rejection'}:mode===1?null:mode===2?[code]:[])});});
 await page.route('**/rest/v1/rpc/reward_cancellation_list',r=>r.fulfill({contentType:'application/json',body:'[]'}));
 await page.route('**/rest/v1/rpc/reward_fulfillment_list',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([delivery])}));
 await login(page);const codes=page.locator('.codeRedemptions'),retry=codes.getByRole('button',{name:'重新讀取兌換碼紀錄',exact:true});
 await expect(codes.getByRole('alert')).toContainText('目前無法確認');await expect(page.getByRole('heading',{name:delivery.title,exact:true})).toBeVisible();
 await expect(codes.getByText('目前沒有兌換碼類型的紀錄。',{exact:true})).toHaveCount(0);
 mode=1;await retry.click();await expect(codes.getByRole('alert')).toBeVisible();
 mode=2;await retry.click();await expect(codes.getByRole('heading',{name:code.reward_catalog.title,exact:true})).toBeVisible();
 mode=3;await retry.click();await expect(codes.getByText('目前沒有兌換碼類型的紀錄。',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:delivery.title,exact:true})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'兌換操作',exact:true}).getByRole('link',{name:'我的通知 →',exact:true})).toHaveAttribute('href','/account/notifications');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('cancellation retains a failed draft, prevents duplicate writes and preserves accepted outcome when readback fails',async({page})=>{
 test.setTimeout(60000);let failed=false,submitted=false,calls=0,release=()=>{};
 page.on('dialog',d=>d.accept());
 await page.route('**/rest/v1/reward_redemptions?**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(submitted?[]:[code])}));
 await page.route('**/rest/v1/rpc/reward_fulfillment_list',r=>r.fulfill({contentType:'application/json',body:'[]'}));
 await page.route('**/rest/v1/rpc/reward_cancellation_list',r=>r.fulfill({status:failed?403:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic rejection'}:[{...cancel,status:submitted?'submitted':null}])}));
 await page.route('**/rest/v1/rpc/reward_cancellation_action',async r=>{calls++;expect(r.request().postDataJSON()).toEqual({p_redemption:id,p_action:'submit',p_note:'合成取消原因'});if(calls===1){await new Promise<void>(resolve=>{release=resolve;});await r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Synthetic rejection'})});}else{failed=true;submitted=true;await r.fulfill({status:204,body:''});}});
 await login(page);const panel=page.getByRole('region',{name:'兌換取消與退點',exact:true}),retry=panel.getByRole('button',{name:'重新讀取取消申請',exact:true});
 const draft=panel.getByRole('textbox',{name:'取消原因＊',exact:true});await draft.fill('合成取消原因');await retry.click();await expect(draft).toHaveValue('合成取消原因');
 const submit=panel.getByRole('button',{name:'送出取消申請',exact:true});await submit.click();
 try{await expect.poll(()=>calls).toBe(1);await expect(submit).toBeDisabled();await expect(retry).toBeDisabled();await submit.dispatchEvent('click');expect(calls).toBe(1);}finally{release();}
 await expect(panel.getByRole('alert')).toContainText('操作未完成');await expect(draft).toHaveValue('合成取消原因');
 await submit.click();await expect(panel.getByRole('status').filter({hasText:'取消申請已送審'})).toBeVisible();await expect(panel.getByRole('alert')).toContainText('目前無法讀取取消申請');expect(calls).toBe(2);
 await expect(page.getByText('SYNTHETIC-ONLY',{exact:true})).toHaveCount(0);
 failed=false;await retry.click();await expect(panel.getByText('取消審核中',{exact:true})).toBeVisible();await expect(panel.getByRole('button',{name:'撤回取消申請',exact:true})).toBeVisible();
 await page.reload();await expect(panel.getByText('取消審核中',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('fulfillment reports retry without losing drafts or hiding successful updates behind failed reads',async({page})=>{
 test.setTimeout(60000);let unreadable=true,calls=0,release=()=>{},reported=false;
 await page.route('**/rest/v1/reward_redemptions?**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([code])}));
 await page.route('**/rest/v1/rpc/reward_cancellation_list',r=>r.fulfill({contentType:'application/json',body:'[]'}));
 await page.route('**/rest/v1/rpc/reward_fulfillment_list',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(unreadable?null:[{...delivery,issue_note:reported?'合成履約問題':null}])}));
 await page.route('**/rest/v1/rpc/reward_fulfillment_action',async r=>{calls++;expect(r.request().postDataJSON()).toMatchObject({p_redemption:delivery.id,p_action:'report_issue',p_note:'合成履約問題'});if(calls===1){await new Promise<void>(resolve=>{release=resolve;});await r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Synthetic rejection'})});}else{unreadable=true;reported=true;await r.fulfill({status:204,body:''});}});
 await login(page);const panel=page.getByRole('region',{name:'我的預約與配送',exact:true}),retry=panel.getByRole('button',{name:'重新讀取預約與配送',exact:true});
 await expect(panel.getByRole('alert')).toContainText('目前無法讀取');await expect(panel.getByText('目前沒有預約或配送紀錄。',{exact:true})).toHaveCount(0);
 unreadable=false;await retry.click();const draft=panel.getByRole('textbox',{name:'問題說明',exact:true});await draft.fill('合成履約問題');await retry.click();await expect(draft).toHaveValue('合成履約問題');
 const submit=panel.getByRole('button',{name:'回報履約問題',exact:true});await submit.click();
 try{await expect.poll(()=>calls).toBe(1);await expect(draft).toBeDisabled();await expect(retry).toBeDisabled();await submit.dispatchEvent('click');expect(calls).toBe(1);}finally{release();}
 await expect(panel.getByRole('alert')).toContainText('操作未完成');await expect(draft).toHaveValue('合成履約問題');
 await submit.click();await expect(panel.getByRole('status').filter({hasText:'進度已更新。'})).toBeVisible();await expect(panel.getByRole('alert')).toContainText('目前無法讀取');expect(calls).toBe(2);
 await expect(page.locator('.codeRedemptions').getByRole('heading',{name:code.reward_catalog.title,exact:true})).toBeVisible();
 unreadable=false;await retry.click();await expect(panel.getByText('問題回報：合成履約問題',{exact:true})).toBeVisible();await expect(draft).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

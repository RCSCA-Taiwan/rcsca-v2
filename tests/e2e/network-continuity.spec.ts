import {expect,test,type Page} from '@playwright/test';

async function login(page:Page,path:string){
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 await page.goto(`/login?next=${encodeURIComponent(path)}`);
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(path.replaceAll('/','\\/')+'$'));
}

test('talent request keeps a direct route to owned progress',async({page})=>{
 await page.goto('/member-network/talent-request');
 const progress=page.getByRole('link',{name:'查看我的需求與進度 →',exact:true});
 await expect(progress).toHaveAttribute('href','/account/requests');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('job interest survives reload from owned request history',async({page})=>{
 const jobId='15500000-0000-4000-8000-000000006401';
 await page.route('**/rest/v1/enterprise_shares?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{
  id:jobId,title:'連續性測試工作',description:'測試工作說明',enterprise_id:'15500000-0000-4000-8000-000000006499'
 }])}));
 await page.route('**/rest/v1/network_requests?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{
  private_detail:`來源 enterprise_share:${jobId}`
 }])}));
 await login(page,'/member-network/jobs');
 const card=page.locator('.jobBoard article').filter({hasText:'連續性測試工作'});
 await expect(card).toBeVisible();
 await expect(card.getByRole('button')).toBeDisabled();
 await page.reload();
 await expect(card.getByRole('button')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('matching response read failure never reopens an unsafe reply and can recover',async({page})=>{
 let responsesFail=true;
 const requestId='15500000-0000-4000-8000-000000006501';
 await page.route('**/rest/v1/rpc/is_active_member',route=>route.fulfill({status:200,contentType:'application/json',body:'true'}));
 await page.route('**/rest/v1/rpc/network_list_matchable_requests',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{
  id:requestId,title:'媒合連續性測試',request_kind:'life',status:'approved',public_summary:'測試摘要',requester_enterprise_id:null,
  requester_user_id:'15500000-0000-4000-8000-000000006599',created_at:'2026-10-21T00:00:00Z',is_owner:false,has_responded:!responsesFail
 }])}));
 await page.route('**/rest/v1/network_match_responses?**',route=>route.fulfill({
  status:responsesFail?403:200,contentType:'application/json',body:responsesFail?JSON.stringify({message:'Synthetic response read failure'}):'[]'
 }));
 await page.route('**/rest/v1/network_contact_consents?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/rest/v1/network_contact_reveals?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await login(page,'/1percent-network/matches');
 await expect(page.getByRole('alert')).toContainText('部分媒合回應目前無法讀取');
 await expect(page.getByRole('textbox',{name:'回應 媒合連續性測試',exact:true})).toHaveCount(0);
 responsesFail=false;
 await page.getByRole('button',{name:'重新讀取媒合狀態',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'回應 媒合連續性測試',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

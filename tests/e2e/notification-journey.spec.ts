import {expect,test} from '@playwright/test';

test('notifications recover, link to actionable workspaces and report read failures without duplicate writes',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 let failed=true,read=false,writes=0,rejectWrite=true;
 let release=()=>{};
 const id='15500000-0000-4000-8000-000000005401';
 const subjects=[
  ['企業補件','enterprise_application','enterprise_application','/1percent-partner/apply'],
  ['每期供應','partner_offer','partner_offer','/1percent-partner/offers'],
  ['媒合回覆','network','network_response','/1percent-network/matches'],
  ['會籍確認','membership','membership','/account/identity'],
  ['成果審核','esg_asset','enterprise_esg_asset','/1percent-partner/impact'],
  ['兌換履約','reward_fulfillment','reward_redemption','/account/redemptions'],
  ['管理角色','admin_role','profile','/admin/operations'],
 ];
 await page.route('**/rest/v1/user_notifications?**',async route=>{
  expect(new URL(route.request().url()).searchParams.get('recipient_user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);
  const rows=subjects.map(([title,kind,related_type],i)=>({id:id.slice(0,-2)+String(i+1).padStart(2,'0'),title,kind,related_type,related_id:id,body:'合成流程測試',created_at:'2026-10-19T01:00:00Z',read_at:read?'2026-10-19T02:00:00Z':null}));
  rows.push({...rows[0],id:id.slice(0,-2)+'99',title:'不可信參照',related_id:'../../admin'});
  await route.fulfill({status:failed?403:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic read failure'}:rows)});
 });
 await page.route('**/rest/v1/rpc/account_set_notification_read',async route=>{
  writes++;
  expect(route.request().postDataJSON()).toMatchObject({p_notification_id:id,p_read:true});
  if(rejectWrite){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Synthetic write failure'})});return;}
  await new Promise<void>(resolve=>{release=resolve;});
  read=true;
  await route.fulfill({status:200,contentType:'application/json',body:'null'});
 });
 await page.goto('/login?next=%2Faccount%2Fnotifications');
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/notifications$/);
 const panel=page.locator('.accountNotifications');
 await expect(panel.getByRole('alert')).toHaveText('目前無法讀取通知。');
 await expect(panel.getByText('目前沒有新的通知。',{exact:true})).toHaveCount(0);
 failed=false;await panel.getByRole('button',{name:'重新讀取通知',exact:true}).click();
 await expect(panel.getByRole('alert')).toHaveCount(0);
 for(const [title,,,href] of subjects){
  await expect(panel.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('link',{name:'查看相關進度 →',exact:true})).toHaveAttribute('href',href);
 }
 await expect(panel.locator('article').filter({hasText:'兌換履約'}).getByRole('link',{name:'供應方履約工作台（需供應權限） →',exact:true})).toHaveAttribute('href','/account/fulfillment');
 await expect(panel.locator('article').filter({hasText:'不可信參照'}).getByRole('link')).toHaveCount(0);
 const first=panel.locator('article').filter({has:page.getByRole('heading',{name:'企業補件',exact:true})});
 await first.getByRole('button',{name:'我知道了',exact:true}).click();
 await expect(panel.getByRole('alert')).toHaveText('目前無法更新這則通知，請重試。');
 await expect(first.getByRole('button',{name:'我知道了',exact:true})).toBeEnabled();
 rejectWrite=false;
 await first.getByRole('button',{name:'我知道了',exact:true}).click();
 try{
  await expect.poll(()=>writes).toBe(2);
  await expect(first.getByRole('button',{name:'我知道了',exact:true})).toBeDisabled();
  await expect(panel.getByRole('button',{name:'全部標為已讀',exact:true})).toBeDisabled();
  await page.waitForTimeout(100);
  expect(writes).toBe(2);
 }finally{release();}
 await expect(first.getByRole('button',{name:'標為未讀',exact:true})).toBeEnabled();
 await expect(panel.getByRole('alert')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await first.getByRole('link',{name:'查看相關進度 →',exact:true}).click();
 await expect(page).toHaveURL(/\/1percent-partner\/apply$/);
});

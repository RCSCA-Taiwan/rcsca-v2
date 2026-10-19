import {expect,test,type Page} from '@playwright/test';
async function login(page:Page,path:string){
 await page.goto('/login?next='+encodeURIComponent(path));await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page).toHaveURL(new RegExp(path+'$'));
}
const part={id:'17700000-0000-4000-8000-000000006101',status:'pending',created_at:'2026-10-19T01:00:00Z',participation_type:'participant',source_channel:'cash',verified_at:null as string|null,activities:{name:'合成待核實活動'}};
const foot={id:'17700000-0000-4000-8000-000000006102',created_at:'2026-10-19T01:00:00Z',footprint_type:'care',description:'合成已核實共享紀錄',source_type:'activity_participation'};
function owner(url:string){expect(new URL(url).searchParams.get('user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);}

test('activity keeps readable participation without inventing footprint totals and safely retries cancellation',async({page})=>{
 test.setTimeout(60000);test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 let feetFailed=true,partsFailed=false,calls=0,release=()=>{},feet=[foot],parts=[part,...Array.from({length:8},(_,i)=>({...part,id:`17700000-0000-4000-8000-${String(6200+i).padStart(12,'0')}`,status:'verified',activities:{name:`合成舊活動 ${i+1}`}}))];
 await page.route('**/rest/v1/sharing_footprints?**',r=>{owner(r.request().url());return r.fulfill({status:feetFailed?403:200,contentType:'application/json',body:JSON.stringify(feetFailed?{message:'Synthetic footprint rejection'}:feet)});});
 await page.route('**/rest/v1/activity_participations?**',r=>{owner(r.request().url());return r.fulfill({status:partsFailed?403:200,contentType:'application/json',body:JSON.stringify(partsFailed?{message:'Synthetic participation rejection'}:parts)});});
 await page.route('**/rest/v1/rpc/cancel_my_activity_participation',async r=>{
  calls++;expect(r.request().postDataJSON()).toEqual({p_participation_id:part.id});
  if(calls===1){await new Promise<void>(resolve=>{release=resolve;});await r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Synthetic cancellation rejection'})});return;}
  parts=[];partsFailed=true;feetFailed=false;await r.fulfill({status:204,body:''});
 });
 await login(page,'/account/activity');const panel=page.locator('.activityRecords'),retry=panel.getByRole('button',{name:'重新讀取活動紀錄',exact:true});
 await expect(panel.getByRole('alert')).toContainText('足跡數量尚未確認');await expect(panel.locator('.footprintSummary')).toHaveCount(0);
 await expect(panel.getByRole('heading',{name:'合成舊活動 8',exact:true})).toBeVisible();
 const card=panel.locator('.assetGrid article').filter({has:page.getByRole('heading',{name:part.activities.name,exact:true})});
 await card.getByRole('button',{name:'取消登記',exact:true}).click();
 try{await expect.poll(()=>calls).toBe(1);await expect(card.getByRole('button')).toBeDisabled();await expect(retry).toBeDisabled();await card.getByRole('button').dispatchEvent('click');expect(calls).toBe(1);}finally{release();}
 await expect(panel.locator('.workflowNotice[role="alert"]')).toContainText('目前無法取消');
 await card.getByRole('button',{name:'取消登記',exact:true}).click();
 await expect(panel.getByRole('status').filter({hasText:'已取消尚未核實'})).toBeVisible();await expect(panel.getByRole('alert')).toContainText('目前無法確認參與登記');
 await expect(panel.getByRole('heading',{name:foot.description,exact:true})).toBeVisible();await expect(panel.getByText('目前沒有活動參與登記。',{exact:true})).toHaveCount(0);expect(calls).toBe(2);
 partsFailed=false;await retry.click();await expect(panel.getByText('目前沒有活動參與登記。',{exact:true})).toBeVisible();
 feet=[];await retry.click();await expect(panel.getByText('目前還沒有已核實的共享足跡。',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('verification recovers unreadable records and connects verification, footprints and registration',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 let malformed=true,footReads=0;
 await page.route('**/rest/v1/activity_participations?**',r=>{owner(r.request().url());return r.fulfill({contentType:'application/json',body:JSON.stringify(malformed?null:[{...part,status:'verified',verified_at:'2026-10-19T02:00:00Z'}])});});
 await page.route('**/rest/v1/sharing_footprints?**',r=>{owner(r.request().url());footReads++;return r.fulfill({contentType:'application/json',body:JSON.stringify([foot])});});
 await login(page,'/care-actions/verification');const panel=page.locator('.activityVerification');
 await expect(panel.getByRole('alert')).toContainText('目前無法讀取參與核實紀錄');await expect(panel.getByText('目前沒有待核實或已核實的公益參與紀錄。',{exact:true})).toHaveCount(0);expect(footReads).toBe(0);
 malformed=false;await panel.getByRole('button',{name:'重新讀取參與核實紀錄',exact:true}).click();
 await expect(panel.getByText('已完成核實',{exact:true})).toBeVisible();await expect(panel.getByText('現金轉交',{exact:true})).toBeVisible();expect(footReads).toBe(0);
 await page.reload();await expect(panel.getByText('已完成核實',{exact:true})).toBeVisible();
 await panel.getByRole('navigation',{name:'活動參與操作',exact:true}).getByRole('link',{name:'我的登記與共享足跡 →',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/activity$/);await expect(page.getByRole('heading',{name:foot.description,exact:true})).toBeVisible();
 await page.getByRole('navigation',{name:'活動參與操作',exact:true}).getByRole('link',{name:'登記參與 →',exact:true}).click();
 await expect(page).toHaveURL(/\/care-actions\/participate$/);await expect(page.getByRole('navigation',{name:'活動參與操作',exact:true}).getByRole('link',{name:'登記參與 →',exact:true})).toHaveAttribute('aria-current','page');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

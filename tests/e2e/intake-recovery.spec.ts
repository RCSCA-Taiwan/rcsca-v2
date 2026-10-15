import {expect,test,type Page} from '@playwright/test';

const activityId='15500000-0000-4000-8000-000000000001';
const activity={id:activityId,name:'參與登記測試活動',code:'REGRESSION-ACTIVITY'};
const job={id:'15500000-0000-4000-8000-000000000002',title:'工作意願測試',description:'公開工作說明',enterprise_id:'15500000-0000-4000-8000-000000000003'};

async function login(page:Page,path:string) {
  await page.goto(`/login?next=${encodeURIComponent(path)}`);
  await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole('button',{name:'登入',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

for(const item of [
  {path:'/care-actions/participate',table:'activities',row:activity,error:'活動清單讀取失敗',title:activity.name},
  {path:'/member-network/jobs',table:'enterprise_shares',row:job,error:'工作機會讀取失敗',title:job.title},
]) {
  test(`${item.path}: read failure can recover without pretending there is no data`,async({page})=>{
    let fail=true;
    await page.route(`**/rest/v1/${item.table}?**`,async route=>{
      await route.fulfill({status:fail?403:200,contentType:'application/json',
        body:fail?JSON.stringify({message:'Synthetic read failure'}):JSON.stringify([item.row])});
    });
    await page.goto(item.path);
    await expect(page.locator('p[role="alert"]')).toContainText(item.error);
    if(item.table==='activities') await expect(page.getByRole('button',{name:'登記參與 →',exact:true})).toBeDisabled();
    else await expect(page.locator('.jobBoard')).toHaveCount(0);
    fail=false;
    await page.getByRole('button',{name:'重新讀取',exact:true}).click();
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    if(item.table==='activities') await expect(page.getByRole('combobox',{name:'選擇目前活動',exact:true})).toHaveValue(activityId);
    else await expect(page.getByRole('heading',{name:item.title,exact:true})).toBeVisible();
  });
}

test('participation releases failed submissions and prevents duplicate in-flight/successful submits',async({page})=>{
  test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member credentials required');
  await page.route('**/rest/v1/activities?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([activity])}));
  let requests=0,release=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/rest/v1/rpc/activity_register_participation',async route=>{
    requests++;
    if(requests===1){await gate;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'P0001',message:'Synthetic rejected request'})});}
    else await route.fulfill({contentType:'application/json',body:JSON.stringify(activityId)});
  });
  try {
    await login(page,'/care-actions/participate');
    await page.getByRole('button',{name:'登記參與 →',exact:true}).click();
    await expect.poll(()=>requests).toBe(1);
    await expect(page.getByRole('button',{name:'登記中…',exact:true})).toBeDisabled();
    await page.locator('form').dispatchEvent('submit');
    expect(requests).toBe(1);
    release();
    await expect(page.locator('.authMessage[role="status"]')).toContainText('登記失敗');
    await expect(page.getByRole('button',{name:'登記參與 →',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'登記參與 →',exact:true}).click();
    await expect(page.getByRole('button',{name:'已登記',exact:true})).toBeDisabled();
    await expect(page.locator('.authMessage[role="status"]')).toContainText('已登記。活動完成後');
    await page.locator('form').dispatchEvent('submit');
    expect(requests).toBe(2);
  } finally {release();}
});

test('job interest disables pending and successful actions and recovers from a rejected request',async({page})=>{
  test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member credentials required');
  await page.route('**/rest/v1/enterprise_shares?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([job])}));
  let requests=0,release=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/rest/v1/rpc/member_submit_network_request',async route=>{
    requests++;
    if(requests===1){await gate;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'P0001',message:'Synthetic rejected request'})});}
    else await route.fulfill({contentType:'application/json',body:JSON.stringify(job.id)});
  });
  try {
    await login(page,'/member-network/jobs');
    await page.getByRole('button',{name:'我有興趣',exact:true}).click();
    await expect.poll(()=>requests).toBe(1);
    await expect(page.locator('.jobBoard button')).toBeDisabled();
    release();
    await expect(page.locator('.privacyCallout p[role="status"]')).toContainText('目前無法確認送出結果');
    await expect(page.getByRole('link',{name:'查看我的需求',exact:true})).toHaveAttribute('href','/account/requests');
    await expect(page.getByRole('button',{name:'我有興趣',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'我有興趣',exact:true}).click();
    await expect(page.getByRole('button',{name:'已送出意願 ✓',exact:true})).toBeDisabled();
    expect(requests).toBe(2);
  } finally {release();}
});

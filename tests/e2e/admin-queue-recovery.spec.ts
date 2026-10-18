import {expect,test} from '@playwright/test';

test('partial admin queue keeps successful rows, identifies the failed queue and recovers on retry',async({page})=>{
  test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
  const tables=['activity_participations','enterprise_shares','network_match_responses','support_cases','enterprise_applications','reward_redemptions','activities','record_change_requests'];
  let failed=true,reads=0;
  for(const table of tables)await page.route(`**/rest/v1/${table}?**`,async route=>{
    if(table==='network_match_responses')reads++;
    const deny=table==='network_match_responses'&&failed;
    const data=table==='activities'?[{id:'10000000-0000-4000-8000-000000004300',name:'Synthetic queue recovery',status:'draft',created_at:'2026-01-01T00:00:00Z'}]:[];
    await route.fulfill({status:deny?403:200,contentType:'application/json',body:JSON.stringify(deny?{code:'42501',message:'Synthetic denied read'}:data)});
  });
  await page.goto('/login?next=%2Fadmin%2Fqueue');
  await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole('button',{name:'登入',exact:true}).click();
  const warning=page.locator('.workflowNotice[role="alert"]');
  await expect(warning).toContainText('Network 媒合');
  await expect(page.locator('.adminQueueRow')).toContainText('Synthetic queue recovery');
  await expect(page.locator('.adminQueue .emptyData')).toHaveCount(0);
  expect(reads).toBe(1);
  failed=false;
  await warning.getByRole('button',{name:'重新讀取',exact:true}).click();
  await expect(warning).toHaveCount(0);
  await expect(page.locator('.adminQueueRow')).toContainText('Synthetic queue recovery');
  expect(reads).toBe(2);
  // An entirely unreadable list must never be presented as an empty queue.
  for(const table of tables)await page.route(`**/rest/v1/${table}?**`,route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"Synthetic outage"}'}));
  await page.reload();
  await expect(warning).toContainText('清單尚未完整');
  await expect(page.locator('.adminQueueRow')).toHaveCount(0);
  await expect(page.locator('.adminQueue .emptyData')).toHaveCount(0);
  await expect(warning.getByRole('button',{name:'重新讀取',exact:true})).toBeEnabled();
});

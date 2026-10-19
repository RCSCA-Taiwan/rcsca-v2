import {expect,test} from '@playwright/test';

test('request progress distinguishes partial failure, total failure, completed records and a verified empty result',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 let phase:'partial'|'failed'|'recovered'|'empty'='partial';
 const id='15500000-0000-4000-8000-000000005201';
 for(const table of ['network_requests','support_cases','enterprise_service_requests']){
  await page.route(`**/rest/v1/${table}?**`,async route=>{
   const url=new URL(route.request().url());
   expect(url.searchParams.get(table==='support_cases'?'owner_user_id':'requester_user_id')).toMatch(/^eq\.[0-9a-f-]{36}$/i);
   const failed=phase==='failed'||(phase==='partial'&&table==='network_requests');
   const rows=phase==='partial'&&table==='support_cases'?[{id,title:'保留可讀取的關懷紀錄',status:'needs_info',updated_at:'2026-10-19T01:00:00Z',public_summary:'測試補件摘要'}]:phase==='recovered'&&table==='network_requests'?[{id,title:'已完成的媒合仍可回看',status:'completed',request_kind:'life',updated_at:'2026-10-19T02:00:00Z',public_summary:'測試完成摘要'}]:[];
   await route.fulfill({status:failed?503:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic read failure'}:rows)});
  });
 }
 await page.goto('/login?next=%2Faccount%2Frequests');
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/requests$/);
 const progress=page.locator('.requestProgress');
 const retry=progress.getByRole('button',{name:'重新讀取需求進度',exact:true});
 await expect(progress.getByRole('alert')).toContainText('共享媒合');
 await expect(progress.getByRole('heading',{name:'保留可讀取的關懷紀錄',exact:true})).toBeVisible();
 await expect(progress.getByRole('link',{name:'查看相關流程 →',exact:true})).toHaveAttribute('href',`/account/requests/support/${id}`);
 await expect(progress.getByText('目前沒有需求紀錄。',{exact:true})).toHaveCount(0);
 phase='failed';await retry.click();
 await expect(progress.getByRole('alert')).toContainText('這不代表沒有紀錄');
 await expect(progress.locator('article')).toHaveCount(0);
 await expect(progress.getByText('目前沒有需求紀錄。',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('navigation',{name:'其他申請與結果紀錄'})).toBeVisible();
 phase='recovered';await retry.click();
 await expect(progress.getByRole('alert')).toHaveCount(0);
 await expect(progress.getByRole('heading',{name:'已完成的媒合仍可回看',exact:true})).toBeVisible();
 await expect(progress.getByText('已完成',{exact:true})).toBeVisible();
 phase='empty';await retry.click();
 await expect(progress.getByText('目前沒有需求紀錄。',{exact:true})).toBeVisible();
 await expect(progress.getByRole('alert')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

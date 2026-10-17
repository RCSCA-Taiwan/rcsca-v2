import {expect,test} from '@playwright/test';

for(const failure of ['transient','persistent','forbidden'] as const){
  test(`account snapshot handles ${failure} profile rejection without inventing balances`,async({page})=>{
    test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member credentials required');
    await page.goto('/login?next=%2Faccount%2Fsecurity');
    await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
    await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
    await page.getByRole('button',{name:'登入',exact:true}).click();
    await expect(page).toHaveURL(/\/account\/security$/);
    let requests=0;
    await page.route('**/rest/v1/profiles?**',async route=>{
      const url=new URL(route.request().url());
      if(url.searchParams.get('select')!=='display_name,email'){await route.continue();return;}
      requests++;
      if(failure==='transient'&&requests>1){await route.continue();return;}
      await route.fulfill({status:failure==='forbidden'?403:401,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Synthetic profile rejection'})});
    });
    await page.goto('/account');
    if(failure==='transient'){
      await expect(page.locator('.liveIdentity')).toBeVisible();
      await expect(page.locator('.liveAccountGuest[role="alert"]')).toHaveCount(0);
      expect(requests).toBe(2);
    }else{
      await expect(page.locator('.liveAccountGuest[role="alert"]')).toContainText('目前無法讀取會員資料');
      await expect(page.locator('.liveIdentity')).toHaveCount(0);
      expect(requests).toBe(failure==='forbidden'?1:2);
      if(failure==='persistent'){
        await page.unroute('**/rest/v1/profiles?**');
        await page.getByRole('button',{name:'重新讀取',exact:true}).first().click();
        await expect(page.locator('.liveIdentity')).toBeVisible();
      }
    }
  });
}

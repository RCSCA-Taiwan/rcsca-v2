import {test,expect} from '@playwright/test';
test('supply management has an explicit guide entrance and preserves the sign-in destination',async({page})=>{
 await page.goto('/guide');
 await page.getByRole('searchbox',{name:'搜尋功能或想做的事'}).fill('每期');
 const link=page.getByRole('link',{name:'管理每期產品／服務供應'});
 await expect(link).toBeVisible();await link.click();
 await expect(page).toHaveURL(/\/login\?next=%2F1percent-partner%2Foffers$/);
});
test('redemption cards show availability, quantity, points and a consistent image placeholder',async({page})=>{
 const base={category:'daily',point_cost:8,stock_remaining:3,stock_total:3,min_level:1,min_footprints:0,description:'Synthetic offer',fulfillment_type:'delivery',starts_at:null,ends_at:null};
 await page.route('**/rest/v1/reward_catalog?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{...base,id:'00000000-0000-4000-8000-000000001671',title:'Future product',starts_at:'2099-01-01T00:00:00Z'},{...base,id:'00000000-0000-4000-8000-000000001672',title:'Full product',stock_remaining:0},{...base,id:'00000000-0000-4000-8000-000000001673',title:'Past product',ends_at:'2020-01-01T00:00:00Z'}])}));
 await page.route('**/rest/v1/rpc/public_partner_offer_media',route=>route.fulfill({contentType:'application/json',body:'[]'}));
 await page.goto('/share-market');
 const future=page.locator('.rewardCard').filter({has:page.getByRole('heading',{name:'Future product',exact:true})});
 await expect(future).toContainText('尚未開始');await expect(future).toContainText('8 共享點');await expect(future).toContainText('剩餘份數 3');await expect(future.locator('.offerImagePlaceholder')).toBeVisible();
 await expect(page.locator('.rewardCard').filter({has:page.getByRole('heading',{name:'Full product',exact:true})})).toContainText('已額滿');
 await expect(page.locator('.rewardCard').filter({has:page.getByRole('heading',{name:'Past product',exact:true})})).toContainText('已截止');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

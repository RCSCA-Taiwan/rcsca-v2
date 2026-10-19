import {test,expect} from '@playwright/test';

test('mobile home orbit caption stays below the connection node in all languages',async({page,isMobile})=>{
 test.skip(!isMobile,'Narrow mobile layout regression.');
 await page.addInitScript(()=>{
  sessionStorage.setItem('rcsca-brand-entered-v20','1');
  localStorage.setItem('rcsca-lang',new URL(location.href).searchParams.get('layout_lang')||'zh-Hant');
 });
 for(const width of [320,430]){
  await page.setViewportSize({width,height:850});
  for(const locale of ['zh-Hant','en','ja','ko']){
   await page.goto(`/?layout_lang=${locale}`);
   await expect(page.locator('html')).toHaveAttribute('lang',locale);
   const node=await page.locator('.livingCycle .n4').boundingBox();
   const caption=await page.locator('.cycleCaption').boundingBox();
   expect(node).not.toBeNull();expect(caption).not.toBeNull();
   expect(caption!.y-(node!.y+node!.height),`${width}px ${locale}`).toBeGreaterThanOrEqual(8);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px ${locale}`).toBe(true);
  }
 }
});

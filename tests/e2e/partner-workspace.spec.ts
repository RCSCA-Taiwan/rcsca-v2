import {expect,test} from '@playwright/test';

test('public collaboration request preserves the protected fulfillment destination',async({page})=>{
 await page.goto('/1percent-partner/esg');
 const nav=page.getByRole('navigation',{name:'企業合作與供應',exact:true});
 await expect(nav.getByRole('link',{name:'提出合作需求',exact:true})).toHaveAttribute('aria-current','page');
 await nav.getByRole('link',{name:'預約／配送履約',exact:true}).click();
 await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Ffulfillment$/);
});

test('signed-in supplier can move between offers, fulfillment and requests and return to the overview',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 await page.goto('/login?next=%2F1percent-partner%2Foffers');
 await page.getByRole('button',{name:'Email＋密碼',exact:true}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/1percent-partner\/offers$/);
 const nav=page.getByRole('navigation',{name:'企業合作與供應',exact:true});
 await expect(nav.getByRole('link',{name:'每期供應',exact:true})).toHaveAttribute('aria-current','page');
 await nav.getByRole('link',{name:'預約／配送履約',exact:true}).click();
 await expect(page.getByRole('heading',{name:'共享所履約工作台',exact:true})).toBeVisible();
 await expect(nav.getByRole('link',{name:'預約／配送履約',exact:true})).toHaveAttribute('aria-current','page');
 await nav.getByRole('link',{name:'合作需求進度',exact:true}).click();
 await expect(page).toHaveURL(/\/1percent-partner\/requests$/);
 await expect(nav.getByRole('link',{name:'合作需求進度',exact:true})).toHaveAttribute('aria-current','page');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await nav.getByRole('link',{name:'合作總覽',exact:true}).click();
 await expect(page).toHaveURL(/\/1percent-partner\/dashboard$/);
 await expect(nav.getByRole('link',{name:'合作總覽',exact:true})).toHaveAttribute('aria-current','page');
});

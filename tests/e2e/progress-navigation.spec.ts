import {expect,test} from '@playwright/test';

test('care request gives a protected progress destination before or after submission',async({page})=>{
 await page.goto('/care-actions/request');
 await page.getByRole('link',{name:'查看我的需求與進度 →',exact:true}).click();
 await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Frequests$/);
});

test('signed-in progress hub connects application types, supplementation and results without overflow',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable account required');
 await page.goto('/login?next=%2Faccount%2Frequests');
 await page.getByRole('button',{name:'Email＋密碼'}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/requests$/);
 const nav=page.getByRole('navigation',{name:'其他申請與結果紀錄'});
 await expect(nav.getByRole('link')).toHaveCount(10);
 await expect(nav.getByRole('link',{name:'企業／團體／店家註冊與補件 →',exact:true})).toHaveAttribute('href','/1percent-partner/apply');
 await expect(nav.getByRole('link',{name:'活動參與與核實 →',exact:true})).toHaveAttribute('href','/care-actions/verification');
 await expect(nav.getByRole('link',{name:'資料異動申請 →',exact:true})).toHaveAttribute('href','/account/data-requests');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await nav.getByRole('link',{name:'入會／續會申請 →',exact:true}).click();
 await expect(page).toHaveURL(/\/membership\/apply$/);
 await expect(page.getByRole('heading',{name:'申請進度',exact:true})).toBeVisible();
 await page.goto('/member-network/request');
 await page.getByRole('link',{name:'查看我的需求與進度 →',exact:true}).click();
 await expect(page).toHaveURL(/\/account\/requests$/);
 await expect(nav).toBeVisible();
});

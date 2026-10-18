import {test,expect} from '@playwright/test';

test('feature guide finds a task, clears empty results, and preserves the protected destination',async({page})=>{
 await page.goto('/guide');
 const search=page.getByRole('searchbox',{name:'搜尋功能或想做的事'});
 await search.fill('配送');
 await expect(page.getByRole('link',{name:'查看兌換／預約／配送與取消'})).toBeVisible();
 await expect(page.getByRole('link',{name:'個人註冊',exact:true})).toHaveCount(0);
 await search.fill('找不到的功能XYZ');
 await expect(page.getByRole('heading',{name:'還沒找到符合的功能'})).toBeVisible();
 await page.getByRole('button',{name:'顯示全部入口',exact:true}).click();
 await expect(search).toHaveValue('');
 await search.fill('人才');
 await expect(page.getByRole('link',{name:'提出人才需求',exact:true})).toHaveAttribute('href','/member-network/talent-request');
 await search.fill('活動');
 await expect(page.getByRole('link',{name:'登記參與關懷活動',exact:true})).toHaveAttribute('href','/care-actions/participate');
 await search.fill('後台完整');
 await expect(page.getByRole('link',{name:'後台完整工作總覽',exact:true})).toHaveAttribute('href','/admin/operations');
 await page.getByRole('button',{name:'清除搜尋',exact:true}).click();
 await page.getByRole('button',{name:'我的資料、積分與紀錄',exact:true}).click();
 await expect(page.getByRole('link',{name:'申請資料修改／重置／刪除'})).toBeVisible();
 await page.getByRole('link',{name:'查看兌換／預約／配送與取消'}).click();
 await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fredemptions$/);
 await expect(page.getByRole('navigation',{name:'目前位置'}).getByText('登入帳號',{exact:true})).toBeVisible();
 await page.goto('/care-actions/archive');
 await expect(page.getByRole('navigation',{name:'目前位置'}).getByText('歷年行動紀錄',{exact:true})).toBeVisible();
});

test('main navigation and footer give a visible guide entry on desktop and mobile',async({page,isMobile})=>{
 await page.goto('/1percent-partner');
 const header=page.locator('header');
 if(isMobile)await header.locator('summary').click();
 await header.getByRole('link',{name:'功能指南',exact:true}).click();
 await expect(page).toHaveURL(/\/guide$/);
 await expect(page.getByRole('heading',{name:/想做什麼？.*從這裡找到入口。/})).toBeVisible();
 if(isMobile)await expect(header.locator('details')).not.toHaveAttribute('open','');
 await expect(page.locator('footer').getByRole('link',{name:'功能指南與操作入口'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('mobile menu can close with Escape and returns keyboard focus',async({page,isMobile})=>{
 test.skip(!isMobile,'The wide layout displays navigation directly.');
 await page.goto('/guide');
 const summary=page.locator('header summary');
 await summary.click();
 await expect(page.locator('header details')).toHaveAttribute('open','');
 await summary.press('Escape');
 await expect(page.locator('header details')).not.toHaveAttribute('open','');
 await expect(summary).toBeFocused();
});

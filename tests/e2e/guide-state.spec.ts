import {test,expect} from '@playwright/test';

test('guide links retain category and search across reload and returning from a protected destination',async({page})=>{
 await page.goto('/guide?category=connect&q=人才');
 const search=page.getByRole('searchbox',{name:'搜尋功能或想做的事'});
 await expect(search).toHaveValue('人才');
 await expect(page.getByRole('button',{name:'找專業、工作與人才',exact:true})).toHaveAttribute('aria-pressed','true');
 const target=page.getByRole('link',{name:/^提出人才需求/});
 await expect(target).toHaveAttribute('href','/member-network/talent-request');
 await page.reload();
 await expect(search).toHaveValue('人才');
 await target.click();
 await expect(page).toHaveURL(/\/login\?next=%2Fmember-network%2Ftalent-request$/);
 await page.goBack();
 await expect(search).toHaveValue('人才');
 await expect(target).toBeVisible();
 await page.getByRole('button',{name:'清除搜尋',exact:true}).click();
 await expect(page).toHaveURL(/\/guide\?category=connect$/);
 await search.pressSequentially('找不到XYZ');
 await expect(search).toHaveValue('找不到XYZ');
 await expect(page.getByRole('heading',{name:'還沒找到符合的功能'})).toBeVisible();
 expect(new URL(page.url()).searchParams.get('q')).toBe('找不到XYZ');
 await page.getByRole('button',{name:'顯示全部入口',exact:true}).click();
 await expect(page).toHaveURL(/\/guide$/);
 await expect(search).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('an unknown guide category falls back to all features',async({page})=>{
 await page.goto('/guide?category=unknown');
 await expect(page.getByRole('button',{name:'全部功能',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('link',{name:/^提出人才需求/})).toBeVisible();
 await page.getByRole('button',{name:'合作夥伴專區',exact:true}).click();
 await expect(page).toHaveURL(/\/guide\?category=partner$/);
 await page.reload();
 await expect(page.getByRole('button',{name:'合作夥伴專區',exact:true})).toHaveAttribute('aria-pressed','true');
});

import {expect,test} from '@playwright/test';

for(const path of ['/community','/account/contributions','/account/fulfillment'])test(`${path} requires sign-in`,async({page})=>{
 await page.goto(path);await expect(page).toHaveURL(new RegExp('/login\\?next='+encodeURIComponent(path)+'$'));
});

test('community draft validates consent and unsupported image types before upload',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 await page.route('**/rest/v1/rpc/community_posts_list',r=>r.fulfill({contentType:'application/json',body:'[]'}));
 let submitted=0;
 await page.route('**/rest/v1/rpc/community_post_submit',r=>{submitted++;return r.fulfill({contentType:'application/json',body:JSON.stringify('00000000-0000-4000-8000-000000001630')});});
 await page.goto('/login?next=%2Fcommunity');
 await page.getByRole('button',{name:'Email＋密碼'}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await page.getByLabel('標題＊',{exact:true}).fill('Synthetic draft');
 await page.getByLabel('分享內容＊',{exact:true}).fill('Synthetic text');
 await expect(page.getByRole('button',{name:'送出投稿審核',exact:true})).toBeDisabled();
 await page.getByLabel('投稿圖片',{exact:true}).setInputFiles({name:'rejected.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});
 await expect(page.getByRole('status')).toContainText('JPG、PNG 或 WebP');
 expect(submitted).toBe(0);
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'送出投稿審核',exact:true}).click();
 await expect.poll(()=>submitted).toBe(1);
 await expect(page.getByRole('status')).toContainText('投稿已送出');
});

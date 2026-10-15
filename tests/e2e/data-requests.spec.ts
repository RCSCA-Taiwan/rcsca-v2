import {expect,test} from '@playwright/test';

test('data requests require sign-in and preserve destination',async({page})=>{
 await page.goto('/account/data-requests');
 await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fdata-requests$/);
});

test('full reset and deletion each require two separate confirmations and can be cancelled without sending',async({page})=>{
 test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
 await page.route('**/rest/v1/rpc/personal_data_requests_self',r=>r.fulfill({contentType:'application/json',body:'[]'}));
 let calls=0;const payloads:any[]=[];
 await page.route('**/rest/v1/rpc/personal_data_request_submit',async r=>{calls++;payloads.push(r.request().postDataJSON());await r.fulfill({contentType:'application/json',body:JSON.stringify('00000000-0000-4000-8000-000000001610')});});
 await page.goto('/login?next=%2Faccount%2Fdata-requests');
 await page.getByRole('button',{name:'Email＋密碼'}).click();
 await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
 await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 for(const kind of ['reset','delete']){
  await page.getByLabel('申請項目').selectOption(kind);
  await page.getByLabel('申請原因或補充說明＊').fill('Synthetic requested scope');
  await page.getByRole('button',{name:'繼續確認申請',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('heading')).toContainText('第一次提醒');
  await expect(dialog.getByRole('button',{name:'繼續第二次確認'})).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'繼續第二次確認'}).click();
  await expect(dialog.getByRole('heading')).toContainText('第二次確認');
  await expect(dialog.getByRole('button',{name:'確認送出審核申請'})).toBeDisabled();
  expect(calls).toBe(payloads.length);
  await dialog.getByRole('button',{name:'取消，保留原資料'}).click();
  const before=calls;
  await page.getByRole('button',{name:'繼續確認申請',exact:true}).click();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'繼續第二次確認'}).click();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'確認送出審核申請'}).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(()=>calls).toBe(before+1);
  expect(payloads.at(-1)).toMatchObject({p_kind:kind,p_confirm_one:true,p_confirm_two:true,p_changes:{}});
  await expect(page.getByRole('status')).toContainText('申請已送出');
 }
 expect(calls).toBe(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

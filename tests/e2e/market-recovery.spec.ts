import { expect, test, type Page } from '@playwright/test';

const reward = { id:'00000000-0000-4000-8000-000000001570', category:'daily', title:'兌換流程測試',
  description:'隔離測試方案', point_cost:6, stock_remaining:3, stock_total:3, min_level:1, min_footprints:0,
  starts_at:null, ends_at:'2099-12-31T00:00:00Z' };
async function login(page: Page) {
  await page.goto('/login?next=%2Fshare-market');
  await page.getByRole('button', { name:'Email＋密碼' }).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole('button', { name:'登入', exact:true }).click();
  await expect(page).toHaveURL(/\/share-market$/);
}

test('market read failures can retry and never present unknown balance as zero', async ({ page }) => {
  let fail = true;
  await page.route('**/rest/v1/reward_catalog?**', route => route.fulfill({ status:fail ? 503 : 200,
    contentType:'application/json', body:fail ? JSON.stringify({message:'Synthetic unavailable'}) : JSON.stringify([reward]) }));
  await page.goto('/share-market');
  await expect(page.getByRole('alert')).toContainText('讀取失敗');
  await expect(page.locator('.marketWallet strong')).toHaveText('—');
  fail = false;
  await page.getByRole('button', {name:'重新讀取',exact:true}).click();
  await expect(page.getByRole('heading', {name:reward.title})).toBeVisible();
  await expect(page.locator('.marketWallet strong')).toHaveText('登入查看點數');
});

test('member sees point preview, cannot duplicate submission, and balance stays unchanged before approval', async ({ page }) => {
  test.skip(!process.env.RCSCA_E2E_EMAIL || !process.env.RCSCA_E2E_PASSWORD, 'Disposable member required');
  await page.route('**/rest/v1/reward_catalog?**', route => route.fulfill({contentType:'application/json',body:JSON.stringify([reward])}));
  await page.route('**/rest/v1/point_transactions?**', route => route.fulfill({contentType:'application/json',body:'[{"points":20}]'}));
  await page.route('**/rest/v1/reward_redemptions?**', route => route.fulfill({contentType:'application/json',body:'[]'}));
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/rpc/reward_submit_redemption', async route => {
    calls += 1; await gate;
    await route.fulfill({contentType:'application/json',body:JSON.stringify('00000000-0000-4000-8000-000000001571')});
  });
  await login(page);
  await expect(page.locator('.marketWallet strong')).toHaveText('20');
  await page.getByRole('button', {name:'查看兌換 →',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.redemptionBalance dd')).toHaveText(['20','6 共享點','14']);
  const submit = dialog.getByRole('button', {name:'送出兌換申請',exact:true});
  await submit.click();
  await expect(dialog.getByRole('button', {name:'送出中…'})).toBeDisabled();
  await expect.poll(() => calls).toBe(1);
  await dialog.getByRole('button', {name:'送出中…'}).dispatchEvent('click');
  expect(calls).toBe(1);
  release();
  await expect(dialog.getByRole('status')).toContainText('尚未扣點');
  await expect(dialog.getByRole('button', {name:'已有兌換申請'})).toBeDisabled();
  await expect(page.locator('.marketWallet strong')).toHaveText('20');
  await expect(dialog.getByRole('link', {name:'查看我的兌換 →'})).toHaveAttribute('href','/account/redemptions');
});

test('registered nonmember can view points but cannot submit a redemption', async ({ page }) => {
  test.skip(!process.env.RCSCA_E2E_EMAIL || !process.env.RCSCA_E2E_PASSWORD, 'Disposable member required');
  await page.route('**/rest/v1/reward_catalog?**', route => route.fulfill({contentType:'application/json',body:JSON.stringify([reward])}));
  await page.route('**/rest/v1/point_transactions?**', route => route.fulfill({contentType:'application/json',body:'[{"points":20}]'}));
  await page.route('**/rest/v1/memberships?**', route => route.fulfill({contentType:'application/json',body:'null'}));
  let calls = 0;
  await page.route('**/rest/v1/rpc/reward_submit_redemption', route => { calls += 1; return route.abort(); });
  await login(page);
  await expect(page.locator('.marketWallet strong')).toHaveText('20');
  await page.getByRole('button', {name:'查看兌換 →',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('button', {name:'目前不符合兌換條件'})).toBeDisabled();
  expect(calls).toBe(0);
});

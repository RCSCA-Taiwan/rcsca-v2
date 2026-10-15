import {expect,test} from '@playwright/test';

const wallet={balance:125,status:'active_cycle',member_since:'2025-03-15',cycle_start:'2027-03-15',expires_on:'2028-03-14',expires_at:'2028-03-14T16:00:00+00:00',days_left:20};
test('personal card shows verified spendable points, deadline and reminder; read failures stay unknown and recover',async({page})=>{
  test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
  let failed=false;
  await page.route('**/rest/v1/rpc/point_wallet_self',route=>route.fulfill({status:failed?503:200,contentType:'application/json',body:JSON.stringify(failed?{message:'Synthetic unavailable'}:wallet)}));
  await page.goto('/login?next=%2Fmy-1percent');
  await page.getByRole('button',{name:'Email＋密碼'}).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole('button',{name:'登入',exact:true}).click();
  const card=page.locator('.digitalIdentityCard');
  await expect(card.locator('.pointsAvailable strong')).toHaveText('125');
  await expect(card.locator('time')).toHaveText('2028/03/14');
  await expect(card.locator('.pointsExpiry')).toContainText('剩餘 20 天');
  await expect(card.getByRole('status')).toContainText('即將到期');
  const rect=await card.boundingBox(), expiry=await card.locator('.pointsExpiry').boundingBox();
  expect(expiry!.y+expiry!.height).toBeLessThan(rect!.y+rect!.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/share-market');
  await expect(page.locator('.marketWallet>strong')).toHaveText('125');
  await expect(page.locator('.marketWallet time')).toHaveText('2028/03/14');
  failed=true;
  await page.goto('/my-1percent');
  await expect(card.getByRole('alert')).toContainText('目前無法確認積分與到期日');
  await expect(card.locator('.pointsAvailable')).toHaveCount(0);
  failed=false;
  await card.getByRole('button',{name:'重新讀取',exact:true}).click();
  await expect(card.locator('.pointsAvailable strong')).toHaveText('125');
});

test('an unconfirmed admission date never invents an expiry',async({page})=>{
  test.skip(!process.env.RCSCA_E2E_EMAIL||!process.env.RCSCA_E2E_PASSWORD,'Disposable member required');
  await page.route('**/rest/v1/rpc/point_wallet_self',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...wallet,status:'admission_pending',expires_on:null,expires_at:null,days_left:null})}));
  await page.goto('/login?next=%2Fmy-1percent');
  await page.getByRole('button',{name:'Email＋密碼'}).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole('button',{name:'登入',exact:true}).click();
  const card=page.locator('.digitalIdentityCard');
  await expect(card.locator('.pointsAvailable strong')).toHaveText('125');
  await expect(card.locator('.pointsExpiry')).toContainText('到期日待確認');
  await expect(card.locator('time')).toHaveCount(0);
});

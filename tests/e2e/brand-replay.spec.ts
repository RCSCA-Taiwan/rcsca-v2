import { expect, test } from '@playwright/test';

test('logo replays the entrance from home and another page after it was already viewed', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('rcsca-brand-entered-v20', '1'));
  await page.goto('/');
  const entrance = page.getByRole('button', {name:'進入 RCSCA',exact:true});
  await expect(entrance).toHaveCount(0);
  await page.locator('header .brandLockup').click();
  await expect(page).toHaveURL(/\/\?intro=replay$/);
  await expect(entrance).toBeVisible();
  await expect(entrance).toBeEnabled();
  await entrance.click();
  await expect(entrance).toHaveCount(0, {timeout:7000});
  await page.goto('/care-actions');
  await page.locator('header .brandLockup').click();
  await expect(entrance).toBeVisible();
  await expect(entrance).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem('rcsca-brand-entered-v20'))).toBe('1');
});

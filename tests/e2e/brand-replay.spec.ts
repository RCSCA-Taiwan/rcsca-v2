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

test('entrance owns the viewport until deliberate entry, plays a receding flyby before fading, then unlocks the site', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    (window as any).__flybyEngines = [];
    window.AudioContext = class extends NativeAudioContext {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when?: number) => {
          (window as any).__flybyEngines.push({frequency: oscillator.frequency.value, when});
          start(when);
        };
        return oscillator;
      }
    };
  });
  await page.goto('/#gateway');
  const entrance = page.getByRole('button', {name: '進入 RCSCA', exact: true});
  await expect(entrance).toBeEnabled();
  await expect(page.locator('main')).toHaveCount(0);
  await expect(page.locator('.siteFooter')).toBeHidden();
  const viewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight}));
  const bounds = await entrance.boundingBox();
  expect(bounds?.x).toBe(0);
  expect(bounds?.y).toBe(0);
  expect(bounds?.width).toBe(viewport.width);
  expect(bounds?.height).toBe(viewport.height);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('End');
  if (!isMobile) await page.mouse.wheel(0, 2000);
  await page.evaluate(() => {
    window.scrollTo(0, 2000);
    window.dispatchEvent(new Event('touchmove', {cancelable:true}));
  });
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.clientWidth === innerWidth)).toBe(true);
  await expect(page.locator('main')).toHaveCount(0);
  await entrance.click();
  await expect(entrance).toHaveAttribute('data-phase', 'flyby');
  await expect(entrance).toHaveCSS('opacity', '1');
  await expect(page.locator('main')).toHaveCount(0);
  const notes = await page.evaluate(() => (window as any).__flybyEngines);
  expect(notes).toHaveLength(3);
  expect(notes[0].frequency).toBeCloseTo(170);
  expect(notes[1].frequency).toBeCloseTo(340);
  expect(notes[1].when - notes[0].when).toBeCloseTo(0);
  await expect(entrance).toHaveAttribute('data-phase', 'fading');
  await expect(page.locator('main')).toHaveCount(0);
  await expect(entrance).toHaveCount(0);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.siteFooter')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

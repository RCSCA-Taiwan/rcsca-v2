import {expect,test} from '@playwright/test';

test('protected workspaces are noindex and absent from the public sitemap',async({page,request})=>{
  const protectedResponse=await page.goto('/my-1percent');
  expect(protectedResponse?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page).toHaveURL(/\/login\?next=%2Fmy-1percent$/);

  const login=await request.get('/login');
  expect(login.ok()).toBeTruthy();
  expect(login.headers()['x-robots-tag']).toBe('noindex, nofollow');

  const sitemap=await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText=await sitemap.text();
  expect(sitemapText).not.toContain('/my-1percent</loc>');
  expect(sitemapText).not.toContain('/login</loc>');
  expect(sitemapText).toContain('/register</loc>');

  const robots=await request.get('/robots.txt');
  expect(robots.ok()).toBeTruthy();
  const robotsText=await robots.text();
  expect(robotsText).toContain('Disallow: /account');
  expect(robotsText).toContain('Disallow: /membership');
  expect(robotsText).toContain('Disallow: /my-1percent');
  expect(robotsText).toContain('Disallow: /login');
});

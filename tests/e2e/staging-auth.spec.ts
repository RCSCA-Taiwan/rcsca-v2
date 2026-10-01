import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() === 401) {
      const url = new URL(response.url());
      errors.push(`http: 401 ${url.origin}${url.pathname}`);
    }
  });
  return errors;
}

test("public pages hydrate without browser errors", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/RCSCA/);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);

  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email＋密碼" })).toBeVisible();
  await expect.poll(() => errors).toEqual([]);
});

test("password form is interactive after hydration", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/login?next=%2Faccount");
  await page.getByRole("button", { name: "Email＋密碼" }).click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "登入", exact: true })).toBeEnabled();
  await expect.poll(() => errors).toEqual([]);
});

test("protected account route redirects signed-out visitors", async ({ page }) => {
  const response = await page.goto("/account");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("mobile navigation opens the enterprise entrance without horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile navigation coverage");
  const errors = captureBrowserErrors(page);
  await page.goto("/");
  const entrance = page.getByRole("button", { name: "進入 RCSCA", exact: true });
  await expect(entrance).toBeVisible();
  await expect(entrance).toBeEnabled();
  await entrance.click();
  await expect(entrance).toBeHidden({ timeout: 7000 });
  await page.locator(".mobileMenu summary").click();
  const enterprise = page.locator('.mobileMenuPanel a[href="/1percent-partner"]');
  await expect(enterprise).toBeVisible();
  await enterprise.click();
  await expect(page).toHaveURL(/\/1percent-partner$/);
  await expect(page.locator("main")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await expect.poll(() => errors).toEqual([]);
});

test("verified formal member completes sign-in and sign-out", async ({ page }) => {
  test.skip(
    !process.env.RCSCA_E2E_EMAIL || !process.env.RCSCA_E2E_PASSWORD,
    "RCSCA_E2E_EMAIL and RCSCA_E2E_PASSWORD are required for authenticated coverage",
  );

  const errors = captureBrowserErrors(page);
  await page.goto("/login?next=%2Faccount");
  await page.getByRole("button", { name: "Email＋密碼" }).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole("button", { name: "登入", exact: true }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("RCSCA MEMBER", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "安全登出" })).toBeVisible();
  await expect.poll(() => errors).toEqual([]);

  await page.getByRole("button", { name: "安全登出" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
});


test("account never presents an unreadable point balance as zero and can retry", async ({ page }) => {
  test.skip(!process.env.RCSCA_E2E_EMAIL || !process.env.RCSCA_E2E_PASSWORD,
    "Authenticated coverage requires the CI member credentials");
  let rejectPoints = true;
  await page.route("**/rest/v1/point_transactions?**", async route => {
    if (!rejectPoints) return route.continue();
    await route.fulfill({status:401, contentType:"application/json",
      body:JSON.stringify({code:"PGRST303",message:"JWT claims validation failed"})});
  });
  await page.goto("/login?next=%2Faccount");
  await page.getByRole("button", {name:"Email＋密碼"}).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole("button", {name:"登入",exact:true}).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("alert")).toContainText("點數與共享狀態尚未確認");
  await expect(page.locator(".liveIdentity")).toHaveCount(0);
  rejectPoints = false;
  await page.getByRole("button", {name:"重新讀取",exact:true}).click();
  await expect(page.getByText("RCSCA MEMBER", {exact:true})).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("RCSCA MEMBER", {exact:true})).toBeVisible();
  await page.getByRole("button", {name:"安全登出"}).click();
  await expect(page).toHaveURL(/\/$/);
});

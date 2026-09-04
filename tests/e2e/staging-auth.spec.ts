import { expect, test, type Page } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
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

test("verified Staging account completes sign-in and sign-out", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: "安全登出" })).toBeVisible();
  await expect.poll(() => errors).toEqual([]);

  await page.getByRole("button", { name: "安全登出" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
});

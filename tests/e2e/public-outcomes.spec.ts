import { expect, test } from "@playwright/test";

test("public stories require approval and consent filters", async ({ page }) => {
  await page.route("**/rest/v1/cycle_stories?**", async route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("status")).toBe("eq.approved");
    expect(url.searchParams.get("consent_confirmed")).toBe("eq.true");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([{
      id: "public-test", title: "已同意公開的測試案例", summary: "公開摘要",
      role_flow: ["完成行動", "形成循環"], public_source_label: "已核實行動", public_source_note: null,
    }]) });
  });
  await page.goto("/cycle-of-goodness/cases");
  await expect(page.getByRole("heading", { name: "已同意公開的測試案例", exact: true })).toBeVisible();
  await expect(page.getByText("公開摘要", { exact: true })).toBeVisible();
});

test("public stories distinguish a read failure from an empty list and can retry", async ({ page }) => {
  let fail = true;
  await page.route("**/rest/v1/cycle_stories?**", async route => {
    await route.fulfill({ status: fail ? 503 : 200, contentType: "application/json",
      body: fail ? JSON.stringify({ message: "Synthetic unavailable service" }) : "[]" });
  });
  await page.goto("/cycle-of-goodness/cases");
  await expect(page.getByRole("alert")).toContainText("公開案例讀取失敗");
  await expect(page.locator(".emptyData")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "重新讀取", exact: true }).click();
  await expect(page.locator(".emptyData")).toContainText("目前尚無完成公開審核的真實案例");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

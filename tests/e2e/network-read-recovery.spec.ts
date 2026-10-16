import { expect, test } from "@playwright/test";

for (const path of ["/1percent-network", "/1percent-network/directory"]) {
  test(`${path}: unreadable partner data is not an empty network and can retry`, async ({ page }) => {
    let fail = true;
    await page.route("**/rest/v1/public_network_directory?**", async route => {
      const url = new URL(route.request().url());
      expect(url.pathname).toBe("/rest/v1/public_network_directory");
      await route.fulfill({ status: fail ? 403 : 200, contentType: "application/json",
        body: fail ? JSON.stringify({ message: "Synthetic read failure" }) : JSON.stringify([{
          id: "network-recovery", category: "法律", display_name: "公開夥伴測試節點",
          region: "台北", public_description: "公開專業服務", website_url: null,
        }]) });
    });
    await page.goto(path);
    await expect(page.locator('p[role="alert"]')).toContainText("公開夥伴資料讀取失敗");
    await expect(page.locator(".emptyInvite, .portalGrid article, .industryNode")).toHaveCount(0);
    if (path === "/1percent-network") {
      await expect(page.locator(".networkStats b")).toHaveText(["—", "—", "—", "—"]);
    }
    fail = false;
    await page.getByRole("button", { name: "重新讀取", exact: true }).click();
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    if (path === "/1percent-network") {
      await expect(page.locator(".networkStats b").nth(1)).toHaveText("1");
      await page.getByLabel("產業大類",{exact:true}).selectOption("legal");
      await page.locator(".industryNode").filter({ hasText: "法律" }).click();
      await expect(page.locator(".partnerNames")).toContainText("公開夥伴測試節點");
    } else {
      await expect(page.getByRole("heading", { name: "公開夥伴測試節點", exact: true })).toBeVisible();
      await page.getByRole("textbox", { name: "搜尋名稱、產業、地區或服務", exact: true }).fill("台北");
      await expect(page.getByRole("heading", { name: "公開夥伴測試節點", exact: true })).toBeVisible();
    }
  });
}

test("an actually empty directory retains the invitation to join", async ({ page }) => {
  await page.route("**/rest/v1/public_network_directory?**", route => route.fulfill({
    contentType: "application/json", body: "[]",
  }));
  await page.goto("/1percent-network/directory");
  await expect(page.getByRole("heading", { name: "這個缺口仍然可見", exact: true })).toBeVisible();
  await expect(page.locator('p[role="alert"]')).toHaveCount(0);
});

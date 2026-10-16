import { expect, test } from "@playwright/test";

test("MY 1% identity and dark sections keep readable text contrast", async ({ page }) => {
  test.skip(!process.env.RCSCA_E2E_EMAIL || !process.env.RCSCA_E2E_PASSWORD,
    "Uses the disposable member from the isolated verification job");
  await page.goto("/login?next=%2Fmy-1percent");
  await page.getByRole("button", { name: "Email＋密碼" }).click();
  await page.locator('input[type="email"]').fill(process.env.RCSCA_E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.RCSCA_E2E_PASSWORD!);
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page).toHaveURL(/\/my-1percent$/);
  await expect(page.locator(".identitySection h2")).toBeVisible();
  await expect(page.locator(".journeyStatus strong").first()).toHaveText("RCSCA會員");

  const probes = [
    [".identitySection h2", ".identitySection"],
    [".identitySection .eyebrow", ".identitySection"],
    [".identitySection .sectionHead p", ".identitySection"],
    [".journeyStatus strong", ".journeyStatus>div"],
    [".journeyStatus small", ".journeyStatus>div"],
    [".memberLayerHead p", ".memberLayer"],
    [".memberFeatureGrid p", ".memberFeatureGrid article"],
    [".memberDoor small", ".memberLayer"],
  ];
  for (const [selector, surface] of probes) {
    const ratios = await page.locator(selector).evaluateAll((nodes, backgroundSelector) => {
      function luminance(color: string) {
        const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => {
          const n = v / 255;
          return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
        });
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      }
      return nodes.map(node => {
        const background = node.closest(backgroundSelector)!;
        const a = luminance(getComputedStyle(node).color);
        const b = luminance(getComputedStyle(background).backgroundColor);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
    }, surface);
    expect(ratios.length, selector).toBeGreaterThan(0);
    for (const ratio of ratios) expect(ratio, selector).toBeGreaterThanOrEqual(4.5);
  }
  // A generic .myPage p rule previously overrode dark-card foregrounds.
  // Check every text element against both ends of each actual CSS gradient.
  for (const tone of ['bronze','blackgold']) {
    const ratios=await page.locator(`.levelTrack .${tone}`).evaluate(card=>{
      function lum(color:string){const channels=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
      const stops=getComputedStyle(card).backgroundImage.match(/rgba?\([^)]+\)/g)||[];
      if(stops.length<2)throw Error('Expected explicit gradient stops');
      return Array.from(card.querySelectorAll('span,h3,p,b')).flatMap(node=>stops.map(stop=>{const a=lum(getComputedStyle(node).color),b=lum(stop);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}));
    });
    expect(ratios.length,tone).toBeGreaterThan(0);
    for(const ratio of ratios)expect(ratio,tone).toBeGreaterThanOrEqual(7);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

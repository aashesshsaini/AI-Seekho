import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/products/ai-se-smart-kaam", "/learn", "/learn/achha-prompt-kaise-likhein", "/tools", "/tools/canva", "/services", "/about", "/contact", "/legal/privacy-policy", "/recover"];

for (const path of PAGES) {
  test(`a11y + layout: ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, "no horizontal scroll").toBe(false);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target})`)).toEqual([]);
  });
}

test("unique titles and meta descriptions", async ({ page }) => {
  const seen = new Set<string>();
  for (const p of ["/", "/products/ai-se-smart-kaam", "/learn", "/tools", "/services", "/about", "/contact"]) {
    await page.goto(p);
    const title = await page.title();
    expect(seen.has(title), `duplicate title ${title}`).toBe(false);
    seen.add(title);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
  }
});

test("product page: structured data has price but no fake ratings", async ({ page }) => {
  await page.goto("/products/ai-se-smart-kaam");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld.offers).toMatchObject({ priceCurrency: "INR", price: "199" });
  expect(ld.aggregateRating).toBeUndefined();
  expect(ld.review).toBeUndefined();
});

test("checkout dialog validates input and never claims success without payment", async ({ page }) => {
  await page.goto("/products/ai-se-smart-kaam");
  await page.getByRole("button", { name: /Get AI SE SMART KAAM — ₹199/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Continue to payment" }).click();
  await expect(dialog.getByText("Apna naam likhiye.")).toBeVisible();
  await expect(dialog.getByText(/Sahi email address/)).toBeVisible();
  await dialog.getByLabel("Naam").fill("Test Buyer");
  await dialog.getByLabel("Email").fill("buyer@example.com");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Continue to payment" }).click();
  // Razorpay keys are not configured locally → honest "not configured" message.
  await expect(dialog.getByText(/checkout abhi configure nahi hua/i)).toBeVisible();
  await expect(page.getByText(/Payment verified/)).toHaveCount(0);
});

test("keyboard: skip link reaches main content", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard test on desktop");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("paid files are not publicly reachable", async ({ request }) => {
  for (const p of ["/AI_SE_SMART_KAAM_v4_CUSTOMER_DOWNLOAD.zip", "/.private-assets/ai-se-smart-kaam/v4/AI_SE_SMART_KAAM_v4_CUSTOMER_DOWNLOAD.zip", "/api/download", "/api/download?e=aaaaaaaaaaaaaaaaaaaaaaaa&a=bbbbbbbbbbbbbbbbbbbbbbbb&x=9999999999&s=" + "0".repeat(64)]) {
    const r = await request.get(p);
    expect([403, 404, 410], p).toContain(r.status());
  }
});

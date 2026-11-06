import { expect, test, type Page } from "@playwright/test";

/**
 * Purchase-journey + navigation regression tests.
 * Works against local (`BASE_URL=http://localhost:3100`) or the staging site
 * (set GATE_USER/GATE_PASSWORD env to pass the staging Basic Auth gate).
 */
const PRODUCT = "/products/ai-se-smart-kaam";

const GATE_USER = process.env.GATE_USER ?? process.env.STAGING_GATE_USER ?? "";
const GATE_PASSWORD = process.env.GATE_PASSWORD ?? process.env.STAGING_GATE_PASSWORD ?? "";
test.use({ httpCredentials: GATE_USER ? { username: GATE_USER, password: GATE_PASSWORD } : undefined });

async function expectProductPage(page: Page) {
  await expect(page).toHaveURL(new RegExp(`${PRODUCT}$`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI SE");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("SMART KAAM");
  await expect(page.getByText("Yeh page nahi mila")).toHaveCount(0);
}

test("homepage hero 'Get the AI Playbook' → product page (the reported P0 bug)", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Get the AI Playbook" });
  await expect(cta).toHaveAttribute("href", PRODUCT);
  await cta.click();
  await expectProductPage(page);
});

test("every product CTA on the homepage points to the canonical URL", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.locator("a").evaluateAll((as) =>
    as.filter((a) => /playbook|smart kaam|₹199/i.test(a.textContent ?? "")).map((a) => a.getAttribute("href")),
  );
  expect(hrefs.length).toBeGreaterThanOrEqual(3);
  for (const h of hrefs) expect(h).toBe(PRODUCT);
});

test("desktop header CTA and nav reach the product page", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop header");
  await page.goto("/learn");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Playbook" }).click();
  await expectProductPage(page);
  await page.goto("/about");
  await page.getByRole("banner").getByRole("link", { name: "Get the Playbook" }).click();
  await expectProductPage(page);
});

test("mobile menu opens, navigates, and reaches the product page", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile menu");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.locator("#mobile-menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Playbook", exact: true }).click();
  await expectProductPage(page);
  await expect(menu).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-menu").getByRole("link", { name: "Get the Playbook" }).click();
  await expectProductPage(page);
});

test("product page renders all required content and a working purchase CTA", async ({ page, request }) => {
  const res = await request.get(PRODUCT);
  expect(res.status()).toBe(200);
  await page.goto(PRODUCT);
  const main = page.locator("main");
  await expect(main).toContainText("The Practical AI Playbook");
  await expect(main).toContainText("₹199");
  for (const t of ["practical use cases", "ready-to-use prompts", "complete workflows", "bonus resources", "day challenge"]) await expect(main).toContainText(t);
  for (const n of ["25", "100", "10", "27", "30"]) await expect(main.getByText(n, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /book cover/i }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /book cover/i }).first()).toHaveAttribute("src", /cover\.webp/);
  await expect(page.getByRole("heading", { name: "Selected preview pages" })).toBeVisible();
  expect(await page.locator('figure img[alt]').count()).toBeGreaterThanOrEqual(5);
  await expect(page.getByRole("heading", { name: "Kharidne se pehle" })).toBeVisible();
  const buy = page.getByRole("button", { name: "Get AI SE SMART KAAM — ₹199" }).first();
  await expect(buy).toBeVisible();
  await buy.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Continue to payment" })).toBeVisible();
});

test("product metadata and canonical URL", async ({ page }) => {
  await page.goto(PRODUCT);
  await expect(page).toHaveTitle(/AI SE SMART KAAM/);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(new RegExp(`${PRODUCT}$`));
  expect(await page.locator('meta[property="og:image"]').first().getAttribute("content")).toContain("og-playbook.png");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld.offers?.price).toBe("199");
});

test("nonexistent product URL is a real 404", async ({ request }) => {
  expect((await request.get("/products/does-not-exist")).status()).toBe(404);
});

test("all internal links on key pages resolve (no 404s)", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "crawl once");
  const start = ["/", PRODUCT, "/learn", "/tools", "/services", "/about", "/contact", "/recover"];
  const links = new Set<string>();
  for (const p of start) {
    await page.goto(p);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
    for (const h of hrefs) links.add(h.split("#")[0] || "/");
  }
  for (const must of ["/legal/privacy-policy", "/legal/terms", "/legal/refund-policy", "/legal/delivery-policy", "/legal/support", "/admin/login"]) links.add(must);
  const broken: string[] = [];
  for (const href of links) {
    if (href.startsWith("/api/")) continue;
    const r = await request.get(href);
    if (r.status() !== 200) broken.push(`${href} → ${r.status()}`);
  }
  expect(broken).toEqual([]);
  expect(links.size).toBeGreaterThan(20);
});

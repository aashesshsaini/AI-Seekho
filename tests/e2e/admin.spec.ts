import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "owner@aiseekho.local";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

test("admin requires login (server redirect)", async ({ request }) => {
  for (const p of ["/admin", "/admin/orders", "/admin/settings", "/admin/products"]) {
    const r = await request.get(p, { maxRedirects: 0 });
    expect(r.status(), p).toBe(307);
    expect(r.headers().location).toContain("/admin/login");
  }
});

test("forged admin cookie does not grant access", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "ais_admin", value: "A".repeat(43), url: baseURL! }]);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("wrong password is rejected; correct login reaches dashboard", async ({ page, isMobile }) => {
  test.skip(isMobile || !PASSWORD, "set E2E_ADMIN_PASSWORD to run");
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill("definitely-wrong-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Email ya password galat hai.")).toBeVisible();
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Namaste/ })).toBeVisible();
  await expect(page.getByText("Verified revenue")).toBeVisible();
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
});

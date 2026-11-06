// Usage: node scripts/screenshot.mjs <baseUrl> <outDir> <path> [path...]
import { chromium } from "@playwright/test";
const [, , base, out, ...paths] = process.argv;
const browser = await chromium.launch();
for (const vp of [{ n: "desktop", width: 1440, height: 900 }, { n: "mobile", width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle");
    const name = (p === "/" ? "home" : p.replace(/\//g, "_").replace(/^_/, "")) + "-" + vp.n + ".png";
    await page.screenshot({ path: `${out}/${name}`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(vp.n, p, overflow ? "HORIZONTAL OVERFLOW" : "ok");
  }
  await ctx.close();
}
await browser.close();

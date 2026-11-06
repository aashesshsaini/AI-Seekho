import { afterEach, describe, expect, it, vi } from "vitest";
import { setupTestDb } from "../helpers/db";
import { Customer, Order, Product, ProductAsset } from "@/lib/models/commerce";
import { Tool, Tutorial } from "@/lib/models/content";
import { loadProduct, shouldUseSeedFallback } from "@/lib/data/product";
import { runSeed } from "@/lib/content/run-seed";
import { PRODUCT_SLUG } from "@/lib/content/seed";

setupTestDb();

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NETLIFY;
});

describe("product loading (root cause of the live 404)", () => {
  it("an unseeded database has no product → null → the page 404s (the reported bug)", async () => {
    expect(await loadProduct(PRODUCT_SLUG)).toBeNull();
  });

  it("after the seed, the canonical product loads active at ₹199 with all highlights", async () => {
    await runSeed();
    const p = await loadProduct(PRODUCT_SLUG);
    expect(p).toMatchObject({ slug: "ai-se-smart-kaam", name: "AI SE SMART KAAM", pricePaise: 19900, active: true, coverImage: "/images/product/cover.webp" });
    expect(p!.subtitle).toContain("The Practical AI Playbook");
    expect(p!.highlights).toEqual(
      expect.arrayContaining(["25 practical use cases", "100 ready-to-use prompts", "10 complete AI workflows", "27 bonus resources", "30-day challenge"]),
    );
    expect(p!.previewImages).toHaveLength(5);
  });

  it("an inactive product is returned as inactive (page shows 'not available'), not hidden", async () => {
    await runSeed();
    await Product.updateOne({ slug: PRODUCT_SLUG }, { active: false });
    expect((await loadProduct(PRODUCT_SLUG))?.active).toBe(false);
  });

  it("a nonexistent slug is null", async () => {
    await runSeed();
    expect(await loadProduct("does-not-exist")).toBeNull();
  });

  it("a database failure THROWS — it is never reported as 'product not found'", async () => {
    vi.spyOn(Product, "findOne").mockImplementation(() => {
      throw new Error("connection reset");
    });
    await expect(loadProduct(PRODUCT_SLUG)).rejects.toThrow("connection reset");
  });

  it("never serves sample data on Netlify when MONGODB_URI is missing", () => {
    const saved = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    try {
      expect(shouldUseSeedFallback()).toBe(true); // local design mode
      process.env.NETLIFY = "true";
      expect(() => shouldUseSeedFallback()).toThrow(/refusing to serve sample data/);
    } finally {
      process.env.MONGODB_URI = saved;
    }
  });
});

describe("seed safety (production database)", () => {
  it("is idempotent and preserves admin edits (price, active flag, content)", async () => {
    await runSeed();
    await Product.updateOne({ slug: PRODUCT_SLUG }, { pricePaise: 24900, name: "Edited Name" });
    await Tutorial.updateOne({ slug: "ai-chatbot-kya-hai" }, { body: "edited body" });
    const second = await runSeed();
    expect(second.product.created).toBe(false);
    expect(second.toolsInserted + second.tutorialsInserted + second.servicesInserted).toBe(0);
    const p = await Product.findOne({ slug: PRODUCT_SLUG }).lean();
    expect(p).toMatchObject({ pricePaise: 24900, name: "Edited Name" });
    expect((await Tutorial.findOne({ slug: "ai-chatbot-kya-hai" }).lean())?.body).toBe("edited body");
    expect(await Product.countDocuments()).toBe(1);
    expect(await ProductAsset.countDocuments()).toBe(5);
  });

  it("never touches customers or orders, and never deletes extra content", async () => {
    await runSeed();
    const product = (await Product.findOne().lean())!;
    const c = await Customer.create({ email: "buyer@example.com", name: "Buyer" });
    await Order.create({
      publicId: "AIS-AAAAA-BBBBB", productId: product._id, productSlug: product.slug, productName: product.name, amountPaise: 19900,
      mode: "test", customerId: c._id, customerEmail: c.email, status: "paid", accessHash: "a".repeat(64),
    });
    await Tool.create({ slug: "custom-tool", name: "Custom", website: "https://example.com", category: "chatbots", status: "published" });
    await runSeed();
    expect(await Order.countDocuments()).toBe(1);
    expect((await Order.findOne().lean())?.status).toBe("paid");
    expect(await Customer.countDocuments()).toBe(1);
    expect(await Tool.exists({ slug: "custom-tool" })).toBeTruthy();
  });

  it("keeps product file metadata in sync with the approved v4 package checksums", async () => {
    await runSeed();
    const zip = await ProductAsset.findOne({ filename: "AI_SE_SMART_KAAM_v4_CUSTOMER_DOWNLOAD.zip" }).lean();
    expect(zip).toMatchObject({ sizeBytes: 10696797, sha256: "adc89b4e7202c77333997e294ee8bdc30e30d4eccbd8cd01fc6458e5e9769027", active: true });
  });
});

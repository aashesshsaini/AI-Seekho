import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

async function loadProxy(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import("@/proxy")).proxy;
}

const auth = (u: string, p: string) => ({ authorization: "Basic " + Buffer.from(`${u}:${p}`).toString("base64") });
const req = (path: string, headers: Record<string, string> = {}, cookie?: string) =>
  new NextRequest(new URL(path, "https://staging.example"), { headers: { ...headers, ...(cookie ? { cookie } : {}) } });

afterEach(() => {
  delete process.env.STAGING_GATE_USER;
  delete process.env.STAGING_GATE_PASSWORD;
});

describe("staging gate (proxy)", () => {
  const ENV = { STAGING_GATE_USER: "team", STAGING_GATE_PASSWORD: "a-long-staging-pass-42" };

  it("blocks pages and APIs without credentials (401, noindex)", async () => {
    const proxy = await loadProxy(ENV);
    for (const p of ["/", "/products/ai-se-smart-kaam", "/api/checkout/create", "/order/AIS-AAAAA-AAAAA", "/download/x"]) {
      const r = proxy(req(p));
      expect(r.status, p).toBe(401);
      expect(r.headers.get("www-authenticate")).toContain("Basic");
      expect(r.headers.get("x-robots-tag")).toContain("noindex");
    }
  });

  it("rejects wrong credentials and malformed headers", async () => {
    const proxy = await loadProxy(ENV);
    expect(proxy(req("/", auth("team", "wrong-password-xx"))).status).toBe(401);
    expect(proxy(req("/", auth("other", ENV.STAGING_GATE_PASSWORD))).status).toBe(401);
    expect(proxy(req("/", { authorization: "Basic !!!notbase64" })).status).toBe(401);
    expect(proxy(req("/", { authorization: "Bearer x" })).status).toBe(401);
  });

  it("allows correct credentials and marks responses noindex/private", async () => {
    const proxy = await loadProxy(ENV);
    const r = proxy(req("/", auth("team", ENV.STAGING_GATE_PASSWORD)));
    expect(r.status).toBe(200);
    expect(r.headers.get("x-robots-tag")).toContain("noindex");
    expect(r.headers.get("cache-control")).toContain("no-store");
  });

  it("lets the Razorpay webhook through (it is authenticated by HMAC signature)", async () => {
    const proxy = await loadProxy(ENV);
    expect(proxy(req("/api/webhooks/razorpay")).status).toBe(200);
  });

  it("still requires an admin session cookie behind the gate", async () => {
    const proxy = await loadProxy(ENV);
    const r = proxy(req("/admin/orders", auth("team", ENV.STAGING_GATE_PASSWORD)));
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/admin/login");
  });

  it("is off when not configured, or when the password is too short", async () => {
    let proxy = await loadProxy({ STAGING_GATE_USER: undefined, STAGING_GATE_PASSWORD: undefined });
    expect(proxy(req("/")).status).toBe(200);
    proxy = await loadProxy({ STAGING_GATE_USER: "team", STAGING_GATE_PASSWORD: "short" });
    expect(proxy(req("/")).status).toBe(200);
  });
});

describe("storage driver selection", () => {
  it("refuses the local driver when running on Netlify", async () => {
    vi.resetModules();
    process.env.NETLIFY = "true";
    delete process.env.STORAGE_DRIVER;
    const { getStorage } = await import("@/lib/storage");
    expect(() => getStorage()).toThrow(/netlify-blobs/);
    process.env.STORAGE_DRIVER = "netlify-blobs";
    expect(getStorage().name).toBe("netlify-blobs");
    delete process.env.NETLIFY;
    delete process.env.STORAGE_DRIVER;
  });
});

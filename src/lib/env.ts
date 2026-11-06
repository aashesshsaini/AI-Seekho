import "server-only";

/**
 * Centralised server-side configuration. Secret values are only ever read
 * here and never passed to client components.
 */

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function requireEnv(name: string): string {
  const v = read(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  get siteUrl(): string {
    return (read("NEXT_PUBLIC_SITE_URL") ?? read("URL") ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get mongoUri(): string | undefined {
    return read("MONGODB_URI");
  },
  get mongoDbName(): string {
    return read("MONGODB_DB") ?? "aiseekho";
  },

  // Razorpay
  get razorpayKeyId(): string | undefined {
    return read("RAZORPAY_KEY_ID");
  },
  get razorpayKeySecret(): string | undefined {
    return read("RAZORPAY_KEY_SECRET");
  },
  get razorpayWebhookSecret(): string | undefined {
    return read("RAZORPAY_WEBHOOK_SECRET");
  },
  /** "test" unless explicitly approved for live. */
  get razorpayMode(): "test" | "live" {
    return read("RAZORPAY_MODE") === "live" ? "live" : "test";
  },

  /** HMAC key for download links, checkout cookies, etc. 32+ random bytes. */
  get appSecret(): string {
    const v = read("APP_SECRET");
    if (!v || v.length < 32) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("APP_SECRET must be set to at least 32 characters in production");
      }
      return "dev-only-insecure-secret-change-me-0123456789abcdef";
    }
    return v;
  },

  // Storage
  get storageDriver(): "local" | "netlify-blobs" {
    const v = read("STORAGE_DRIVER");
    if (v === "netlify-blobs") return v;
    return "local";
  },
  get localAssetsDir(): string {
    return read("PRIVATE_ASSETS_DIR") ?? ".private-assets";
  },
  get blobsStore(): string {
    return read("BLOBS_STORE") ?? "product-files";
  },
  /** Optional. Must match the region used by `npm run assets:upload`. Changing it later does not migrate data. */
  get blobsRegion(): string | undefined {
    return read("BLOBS_REGION");
  },

  // Email
  get emailProvider(): "resend" | "none" {
    return read("EMAIL_PROVIDER") === "resend" && read("RESEND_API_KEY") ? "resend" : "none";
  },
  get resendApiKey(): string | undefined {
    return read("RESEND_API_KEY");
  },
  get emailFrom(): string | undefined {
    return read("EMAIL_FROM");
  },
  get adminNotifyEmail(): string | undefined {
    return read("ADMIN_NOTIFY_EMAIL");
  },

  // Spam protection (optional)
  get turnstileSecret(): string | undefined {
    return read("TURNSTILE_SECRET_KEY");
  },
};

export function isDbConfigured(): boolean {
  return Boolean(env.mongoUri);
}

export function isRazorpayConfigured(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

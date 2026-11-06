import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    env: { APP_SECRET: "test-secret-0123456789abcdef0123456789abcdef", RAZORPAY_KEY_ID: "rzp_test_mock", RAZORPAY_KEY_SECRET: "test_key_secret", RAZORPAY_WEBHOOK_SECRET: "test_webhook_secret" },
  },
});

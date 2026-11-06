import { handleRazorpayWebhook } from "@/lib/payments/handlers";

/**
 * Razorpay webhook. The body is read as raw text BEFORE any parsing so the
 * HMAC signature is computed over the exact bytes Razorpay signed.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 512_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
  try {
    const result = await handleRazorpayWebhook(raw, req.headers);
    return Response.json(result.body, { status: result.status });
  } catch (err) {
    // 5xx → Razorpay retries. The event stays unprocessed so the retry is handled.
    console.error("[webhook/razorpay] processing error", (err as Error).name);
    return Response.json({ error: "processing_error" }, { status: 500 });
  }
}

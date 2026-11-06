import { z } from "zod";

/** Checkout request body. `.strict()` rejects any price/amount/currency field — the server decides the price. */
export const checkoutRequestSchema = z
  .object({
    productSlug: z.string().regex(/^[a-z0-9-]{1,80}$/),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().regex(/^[+]?[0-9 ]{10,15}$/).optional(),
    agree: z.literal(true),
  })
  .strict();

/** All monetary amounts are integer paise. Never use floating-point rupees. */

export type Paise = number;

export function isValidPaise(v: unknown): v is Paise {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

/** Converts a rupee string like "199" or "199.50" to paise without float math. */
export function rupeesStringToPaise(input: string): Paise {
  const s = input.trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) throw new Error("Invalid rupee amount");
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function formatINR(paise: Paise): string {
  const rupees = Math.floor(paise / 100);
  const rem = paise % 100;
  const whole = new Intl.NumberFormat("en-IN").format(rupees);
  return rem === 0 ? `₹${whole}` : `₹${whole}.${String(rem).padStart(2, "0")}`;
}

export function paiseToRupeeString(paise: Paise): string {
  const rupees = Math.floor(paise / 100);
  const rem = paise % 100;
  return rem === 0 ? String(rupees) : `${rupees}.${String(rem).padStart(2, "0")}`;
}

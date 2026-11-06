import { describe, expect, it } from "vitest";
import { formatINR, isValidPaise, paiseToRupeeString, rupeesStringToPaise } from "@/lib/money";

describe("money (integer paise)", () => {
  it("converts rupee strings to paise without float errors", () => {
    expect(rupeesStringToPaise("199")).toBe(19900);
    expect(rupeesStringToPaise("199.5")).toBe(19950);
    expect(rupeesStringToPaise("0.29")).toBe(29); // 0.29*100 = 28.999… in float math
    expect(rupeesStringToPaise("1234.07")).toBe(123407);
  });
  it("rejects malformed amounts", () => {
    for (const bad of ["", "abc", "-1", "1.234", "1e3", "199,00", "12345678"]) expect(() => rupeesStringToPaise(bad)).toThrow();
  });
  it("formats INR", () => {
    expect(formatINR(19900)).toBe("₹199");
    expect(formatINR(1999950)).toBe("₹19,999.50");
    expect(paiseToRupeeString(19905)).toBe("199.05");
  });
  it("validates paise integers", () => {
    expect(isValidPaise(19900)).toBe(true);
    expect(isValidPaise(199.5)).toBe(false);
    expect(isValidPaise(-1)).toBe(false);
  });
});

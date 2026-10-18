import {
  PAYMENT_AMOUNT_USD,
  PAYMENT_PRICE_LABEL,
} from "@/lib/payment/constants";
import { describe, expect, it } from "vitest";

describe("payment pricing", () => {
  it("uses the current $15 price everywhere the payment amount is consumed", () => {
    expect(PAYMENT_AMOUNT_USD).toBe(15);
    expect(PAYMENT_PRICE_LABEL).toBe("$15");
  });
});

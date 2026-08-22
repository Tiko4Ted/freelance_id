"use client";

import { useState } from "react";
import { processPaymentAction } from "./actions";

export function PaymentOptions({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState<"mpesa" | "paypal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment(method: "mpesa" | "paypal") {
    setLoading(method);
    setError(null);
    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const res = await processPaymentAction(applicationId);
      if (res.success) {
        window.location.href = `/status?applicationId=${applicationId}`;
      } else {
        throw new Error(res.error || "Payment failed");
      }
    } catch {
      setError("Payment processing failed. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100">
          {error}
        </div>
      )}
      
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => void handlePayment("mpesa")}
        className="w-full relative h-12 flex items-center justify-center rounded-xl bg-[#4CAF50] px-4 font-semibold text-white transition hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === "mpesa" ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        ) : (
          "Pay with M-Pesa"
        )}
      </button>

      <button
        type="button"
        disabled={loading !== null}
        onClick={() => void handlePayment("paypal")}
        className="w-full relative h-12 flex items-center justify-center rounded-xl bg-[#0070ba] px-4 font-semibold text-white transition hover:bg-[#005ea6] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === "paypal" ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        ) : (
          "Pay with PayPal"
        )}
      </button>

      <button
        type="button"
        disabled={loading !== null}
        onClick={() => { window.location.href = `/status?applicationId=${applicationId}`; }}
        className="w-full h-12 flex items-center justify-center rounded-xl border border-neutral-700 bg-transparent px-4 font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
    </div>
  );
}

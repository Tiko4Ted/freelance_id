"use client";

import { useState } from "react";
import { initiateMpesaPaymentAction, processPaymentAction } from "./actions";

export function PaymentOptions({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState<"mpesa" | "paypal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMpesaInput, setShowMpesaInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("254");

  async function handleMpesaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 9) {
      setError("Please enter a valid M-Pesa phone number");
      return;
    }
    
    setLoading("mpesa");
    setError(null);
    try {
      const res = await initiateMpesaPaymentAction(applicationId, phoneNumber);
      if (res.success) {
        window.location.href = `/status?applicationId=${applicationId}`;
      } else {
        throw new Error(res.error || "M-Pesa payment failed");
      }
    } catch (e: any) {
      setError(e.message || "Payment processing failed. Please try again.");
      setLoading(null);
    }
  }

  async function handlePaypal() {
    setLoading("paypal");
    setError(null);
    try {
      // Simulate payment delay for paypal
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const res = await processPaymentAction(applicationId);
      if (res.success) {
        window.location.href = `/status?applicationId=${applicationId}`;
      } else {
        throw new Error(res.error || "Payment failed");
      }
    } catch (e: any) {
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
      
      {showMpesaInput ? (
        <form onSubmit={handleMpesaSubmit} className="space-y-3 p-4 rounded-xl border border-[#4CAF50]/30 bg-[#4CAF50]/5">
          <label className="block text-sm font-medium text-neutral-200">M-Pesa Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="w-full h-11 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 outline-none transition focus:border-[#4CAF50]"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading === "mpesa"}
              onClick={() => setShowMpesaInput(false)}
              className="flex-1 h-11 rounded-md border border-neutral-700 bg-transparent text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading === "mpesa"}
              className="flex-1 relative h-11 flex items-center justify-center rounded-md bg-[#4CAF50] px-4 text-sm font-semibold text-white transition hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "mpesa" ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => setShowMpesaInput(true)}
          className="w-full relative h-12 flex items-center justify-center rounded-xl bg-[#4CAF50] px-4 font-semibold text-white transition hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pay with M-Pesa
        </button>
      )}

      {!showMpesaInput && (
        <>
          <button
            type="button"
            disabled={loading !== null}
            onClick={handlePaypal}
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
        </>
      )}
    </div>
  );
}

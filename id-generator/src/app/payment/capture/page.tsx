"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { capturePaypalPaymentAction } from "../actions";

function CaptureLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get("token"); // PayPal order ID
  const applicationId = searchParams.get("applicationId");
  
  const [error, setError] = useState<string | null>(null);
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) return;
    
    if (!token || !applicationId) {
      setError("Missing token or application ID");
      return;
    }

    captured.current = true;

    async function capture() {
      try {
        const res = await capturePaypalPaymentAction(token!, applicationId!);
        if (res.success) {
          router.replace(`/status?applicationId=${applicationId}`);
        } else {
          setError(res.error || "Failed to capture payment.");
        }
      } catch (error) {
        setError(getErrorMessage(error) || "An unexpected error occurred.");
      }
    }

    capture();
  }, [token, applicationId, router]);

  if (error) {
    return (
      <>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-400 mb-6 border border-red-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Payment Failed</h1>
        <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
          {error}
        </p>
        <button
          onClick={() => router.replace(`/payment?applicationId=${applicationId}`)}
          className="w-full h-12 flex items-center justify-center rounded-xl bg-white px-4 font-semibold text-neutral-950 transition hover:bg-neutral-200"
        >
          Return to Payment
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0070ba]/20 text-[#0070ba] mb-6 border border-[#0070ba]/30 relative">
        <div className="absolute inset-0 rounded-full border-t-2 border-[#0070ba] animate-spin" />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-3">Capturing Payment</h1>
      <p className="text-neutral-400 text-sm mb-4 leading-relaxed">
        Please wait while we confirm your PayPal transaction. Do not close this window.
      </p>
    </>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

export default function PaypalCapturePage() {
  return (
    <main className="h-[100dvh] w-[100vw] bg-[#050505] text-neutral-50 selection:bg-cyan-500/30 overflow-hidden relative font-sans flex items-center justify-center">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full blur-[150px] bg-[#0070ba]/20" />
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full blur-[150px] bg-cyan-900/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 py-[4vh] w-full flex flex-col justify-center items-center text-center">
        <div className="rounded-3xl border border-white/10 bg-[#0a0a0a]/80 p-8 sm:p-12 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] w-full flex flex-col items-center">
          <Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0070ba]"></div>}>
            <CaptureLogic />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

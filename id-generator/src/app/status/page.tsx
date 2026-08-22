import { prisma } from "@/lib/db";
import Link from "next/link";
import { ApplicationStatus } from "@/generated/prisma/client";
import { StatusRefresh } from "./StatusRefresh";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: { applicationId?: string };
}) {
  const applicationId = searchParams.applicationId;

  if (!applicationId) {
    return (
      <main className="h-[100dvh] w-[100vw] bg-[#050505] text-neutral-50 flex items-center justify-center p-6">
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-100 max-w-md w-full text-center">
          Missing application ID. <Link href="/apply" className="underline hover:text-white">Return to the application form</Link>.
        </div>
      </main>
    );
  }

  const application = await prisma.freelanceIdApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    return (
      <main className="h-[100dvh] w-[100vw] bg-[#050505] text-neutral-50 flex items-center justify-center p-6">
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-100 max-w-md w-full text-center">
          Application not found. <Link href="/apply" className="underline hover:text-white">Start a new application</Link>.
        </div>
      </main>
    );
  }

  const pendingTx = await prisma.mpesaTransaction.findFirst({
    where: {
      applicationId: applicationId,
      status: "PENDING"
    },
    orderBy: { createdAt: "desc" }
  });

  const isPending = application.status === ApplicationStatus.PENDING;
  const isPendingMpesa = isPending && !!pendingTx;
  const isAwaitingPayment = isPending && !pendingTx;

  const isProcessing = application.status === ApplicationStatus.PROCESSING;
  const isApproved = application.status === ApplicationStatus.APPROVED;
  const isRejected = application.status === ApplicationStatus.REJECTED;

  return (
    <main className="h-[100dvh] w-[100vw] bg-[#050505] text-neutral-50 selection:bg-cyan-500/30 overflow-hidden relative font-sans flex items-center justify-center">
      {/* If pending Mpesa or processing, we want to auto-refresh to catch webhook updates */}
      {(isPendingMpesa || isProcessing) && <StatusRefresh />}

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full blur-[150px] ${
          isApproved ? "bg-emerald-900/20" : isRejected ? "bg-red-900/20" : "bg-cyan-900/20"
        }`} />
        <div className={`absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full blur-[150px] ${
          isApproved ? "bg-teal-900/20" : isRejected ? "bg-orange-900/20" : "bg-indigo-900/20"
        }`} />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 py-[4vh] w-full max-h-[100dvh] flex flex-col justify-center items-center text-center">
        <div className="rounded-3xl border border-white/10 bg-[#0a0a0a]/80 p-8 sm:p-12 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] w-full flex flex-col items-center">
          
          {isPendingMpesa && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4CAF50]/20 text-[#4CAF50] mb-6 border border-[#4CAF50]/30 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-[#4CAF50] animate-spin" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">Check Your Phone</h1>
              <p className="text-neutral-400 text-sm mb-4 leading-relaxed">
                We've sent an M-Pesa prompt to your phone. Please enter your PIN to complete the $20 payment.
              </p>
              <p className="text-[#4CAF50] text-xs font-semibold animate-pulse">Waiting for Safaricom confirmation...</p>
            </>
          )}

          {isAwaitingPayment && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mb-6 border border-amber-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">Awaiting Payment</h1>
              <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                Your application and identity scan are securely saved. Complete your $20 payment to begin processing.
              </p>
              <Link
                href={`/payment?applicationId=${applicationId}`}
                className="w-full h-12 flex items-center justify-center rounded-xl bg-cyan-400 px-4 font-semibold text-neutral-950 transition hover:bg-cyan-300"
              >
                Resume Payment
              </Link>
            </>
          )}

          {isProcessing && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 mb-6 border border-cyan-500/30 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">Processing...</h1>
              <p className="text-neutral-400 text-sm mb-4 leading-relaxed">
                Payment received. Your Freelance ID is currently being generated. You will receive an email once it is ready.
              </p>
            </>
          )}

          {isApproved && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-6 border border-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">Approved</h1>
              <p className="text-neutral-400 text-sm mb-4 leading-relaxed">
                Your Freelance ID has been successfully generated and issued. Check your email for your digital ID details.
              </p>
            </>
          )}

          {isRejected && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-400 mb-6 border border-red-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">Application Denied</h1>
              <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                Unfortunately, your application was not approved. 
              </p>
              <Link
                href="/apply"
                className="w-full h-12 flex items-center justify-center rounded-xl bg-white px-4 font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Start Over
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

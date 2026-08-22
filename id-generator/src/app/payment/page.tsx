import { PaymentOptions } from "./PaymentOptions";
import Link from "next/link";

export default function PaymentPage({
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

  return (
    <main className="h-[100dvh] w-[100vw] bg-[#050505] text-neutral-50 selection:bg-cyan-500/30 overflow-hidden relative font-sans flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-emerald-900/10 blur-[150px]" />
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-cyan-900/10 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-[2vh] w-full max-h-[100dvh] flex flex-col justify-center overflow-y-auto">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] items-center">
          
          {/* Left Column: Copy */}
          <div className="space-y-[3vh] hidden sm:block">
            <div className="space-y-[2vh]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Scan Successful
              </div>
              <h1 className="text-[clamp(2rem,3.5vw,2.5rem)] font-extrabold tracking-tight leading-[1.1]">
                Complete your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                  Freelance ID
                </span> profile
              </h1>
              <p className="max-w-xl text-[clamp(0.9rem,1.5vw,1rem)] leading-relaxed text-neutral-300">
                Your identity scan has been verified. Finalize your application with a one-time payment of $20 to unlock your professional passport.
              </p>
            </div>
          </div>

          {/* Right Column: Payment Options */}
          <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0a]/80 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] w-full max-w-md mx-auto">
            <div className="sm:hidden text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-wide uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                Scan passed
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Final Step</h2>
              <p className="text-sm text-neutral-400">Complete your one-time $20 payment to finalize processing.</p>
            </div>
            
            <PaymentOptions applicationId={applicationId} />
          </div>
          
        </div>
      </div>
    </main>
  );
}

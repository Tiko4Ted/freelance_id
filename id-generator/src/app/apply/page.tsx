import type { Metadata } from "next";

import { ApplyForm } from "@/components/ApplyForm";

export const metadata: Metadata = {
  title: "Apply | Freelance ID",
};

export default function ApplyPage() {
  return (
    <main className="h-[100dvh] w-[100vw] bg-[#050505] text-neutral-50 selection:bg-cyan-500/30 overflow-hidden relative font-sans flex items-center">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-cyan-900/20 blur-[150px]" />
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-[4vh] w-full max-h-[100dvh] flex flex-col justify-center">
        <div className="grid gap-6 lg:gap-12 lg:grid-cols-[1fr_1fr] items-center">
          
          {/* Left Column: Copy & Feature Highlights */}
          <div className="space-y-[4vh] hidden sm:block">
            <div className="space-y-[2vh]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-xs font-semibold tracking-wide backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-cyan-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                Secure Application
              </div>
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight leading-[1.1]">
                Start your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                  Freelance ID
                </span> application
              </h1>
              <p className="max-w-xl text-[clamp(0.9rem,1.5vw,1.125rem)] leading-relaxed text-neutral-300">
                Submit basic contact details before the scan-quality step. 
                Experience the next generation of professional identity verification.
              </p>
            </div>

            {/* Feature Highlights (Vertical) - only visible if height is sufficient (hidden on small devices) */}
            <div className="grid gap-4 hidden lg:grid h-[fit-content] overflow-hidden">
              <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-cyan-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-0.5">Bank-Grade Verification</h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">Advanced biometric scanning ensures your identity is verified.</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-0.5">Frictionless Onboarding</h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">Use your Freelance ID to apply instantly.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-0.5">Global Trust Network</h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">Join a network recognized by top agencies worldwide.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0a]/80 p-4 sm:p-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] w-full max-w-md mx-auto">
            <ApplyForm />
          </div>
          
        </div>
      </div>
    </main>
  );
}

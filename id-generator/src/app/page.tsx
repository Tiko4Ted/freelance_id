import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-neutral-50 selection:bg-cyan-500/30 overflow-hidden relative font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-cyan-900/20 blur-[150px] pointer-events-none" />
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[150px] pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto px-6 py-24 flex flex-col items-center justify-center min-h-screen text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-sm font-semibold tracking-wide mb-10 backdrop-blur-md shadow-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-cyan-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
          The New Standard for Professional Independence
        </div>

        {/* Headline */}
        <h1 className="max-w-5xl text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          Establish Trust Instantly. <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            Own Your Freelance Identity.
          </span>
        </h1>

        {/* Description */}
        <p className="max-w-2xl text-lg sm:text-xl text-neutral-300 mb-12 leading-relaxed">
          Your Freelance ID is more than just a digital badge—it&apos;s your verified passport to the gig economy. 
          Use it to secure high-paying clients, bypass tedious vetting processes, and seamlessly access exclusive platforms worldwide.
        </p>

        {/* Call to Action */}
        <Link 
          href="/apply"
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full text-lg font-bold transition-all hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(6,182,212,0.3)]"
        >
          Create Your Freelance ID – Get Results in Minutes
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>

        {/* Feature Highlights */}
        <div className="mt-28 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-6xl text-left">
          <div className="flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Bank-Grade Verification</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">Advanced biometric and document scanning ensures your identity is verified with unparalleled accuracy.</p>
          </div>
          
          <div className="flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Frictionless Onboarding</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">Skip the endless forms. Use your Freelance ID to apply to new platforms and client opportunities instantly.</p>
          </div>

          <div className="flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Global Trust Network</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">Join a network recognized by top agencies and marketplaces as the gold standard for freelance professionals.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

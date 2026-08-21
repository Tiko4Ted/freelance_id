import { ScanCamera } from "@/components/ScanCamera";

export default function ScanPage({
  searchParams,
}: {
  searchParams: { applicationId?: string };
}) {
  const applicationId = searchParams.applicationId;

  return (
    <main className="h-[100dvh] w-[100vw] bg-[#050505] text-neutral-50 selection:bg-cyan-500/30 overflow-hidden relative font-sans flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-cyan-900/20 blur-[150px]" />
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-[2vh] w-full max-h-[100dvh] flex flex-col justify-center">
        <div className="grid gap-6 lg:gap-12 lg:grid-cols-[0.85fr_1.15fr] items-center">
          
          {/* Left Column: Copy - hidden on very small vertical screens */}
          <div className="space-y-[3vh] hidden sm:block">
            <div className="space-y-[2vh]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-xs font-semibold tracking-wide backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-cyan-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                Identity Scan
              </div>
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight leading-[1.1]">
                Center your face <br className="hidden lg:block" />
                for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">verification</span>
              </h1>
              <p className="max-w-xl text-[clamp(0.9rem,1.5vw,1.125rem)] leading-relaxed text-neutral-300">
                Keep one face in frame, face the camera directly, and use steady lighting.
              </p>
            </div>
          </div>

          {/* Right Column: Camera */}
          <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0a]/80 p-4 sm:p-6 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] w-full max-w-md mx-auto sm:max-w-none flex flex-col justify-center max-h-[90dvh]">
            <div className="sm:hidden text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Identity Scan</h2>
              <p className="text-xs text-neutral-400">Center your face in the guide</p>
            </div>
            {applicationId ? (
              <ScanCamera applicationId={applicationId} />
            ) : (
              <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-100">
                Missing application ID. Return to the application form and submit
                again.
              </div>
            )}
          </div>
          
        </div>
      </div>
    </main>
  );
}

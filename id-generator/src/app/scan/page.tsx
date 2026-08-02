import { ScanCamera } from "@/components/ScanCamera";

export default function ScanPage({
  searchParams,
}: {
  searchParams: { applicationId?: string };
}) {
  const applicationId = searchParams.applicationId;

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-50 sm:px-6 sm:py-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Scan
          </p>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            Center your face for the demo scan
          </h1>
          <p className="max-w-xl text-base leading-7 text-neutral-300">
            This checks face presence, framing, lighting, and image clarity
            only. It is a portfolio demo, not real document, biometric, or
            government identity verification.
          </p>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm leading-6 text-neutral-300">
            Keep one face in frame, face the camera directly, and use steady
            lighting. The scan auto-captures after about one second of stable
            alignment; the button is available if auto-capture is delayed.
          </div>
        </div>

        {applicationId ? (
          <ScanCamera applicationId={applicationId} />
        ) : (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-100">
            Missing application ID. Return to the application form and submit
            again.
          </div>
        )}
      </section>
    </main>
  );
}

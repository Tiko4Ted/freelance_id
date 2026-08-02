export default function ScanPage({
  searchParams,
}: {
  searchParams: { applicationId?: string };
}) {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-50">
      <section className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
          Scan
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Scan step queued
        </h1>
        <p className="text-neutral-300">
          Application {searchParams.applicationId ?? "unknown"} is ready for
          the facial scan quality flow in Phase 3.
        </p>
      </section>
    </main>
  );
}

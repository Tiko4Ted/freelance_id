export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-50">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
            Freelance ID Generator
          </h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-300">
            Standalone intake, scan-quality review, admin approval, and card
            issuance workflow for demonstration purposes only.
          </p>
        </div>

        <div className="grid gap-4 border-t border-neutral-800 pt-8 sm:grid-cols-3">
          {["Application intake", "Scan quality flow", "Admin issuance"].map(
            (label) => (
              <div
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-5"
                key={label}
              >
                <p className="text-sm font-medium text-neutral-100">{label}</p>
              </div>
            ),
          )}
        </div>
        <a
          className="inline-flex h-11 w-fit items-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200"
          href="/apply"
        >
          Start application
        </a>
      </section>
    </main>
  );
}

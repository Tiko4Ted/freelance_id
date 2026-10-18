import Link from "next/link";

type VerificationCheckpointProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  details?: Array<{ label: string; value: string }>;
};

export function VerificationCheckpoint({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  details,
}: VerificationCheckpointProps) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#050505] px-4 py-8 text-neutral-50">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0a0a0a]/90 p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-10">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-lg font-semibold text-emerald-200"
          >
            ✓
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-400 sm:text-base">
              {description}
            </p>
            {details?.length ? (
              <dl className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                {details.map((detail) => (
                  <div key={detail.label}>
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {detail.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-neutral-100">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:flex sm:items-center">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md bg-cyan-300 px-5 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 active:translate-y-px"
            href={actionHref}
          >
            {actionLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-700 px-5 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-900 active:translate-y-px"
              href={secondaryHref}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function MissingApplicationCheckpoint() {
  return (
    <VerificationCheckpoint
      actionHref="/apply"
      actionLabel="Start a new application"
      description="This verification session is missing an application. Start again to create a fresh verification session."
      eyebrow="Verification session"
      title="We could not find that application."
    />
  );
}

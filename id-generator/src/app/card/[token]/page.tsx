import type { Metadata } from "next";

import { createCardDownloadService } from "@/lib/application-container";

export const metadata: Metadata = {
  title: "Download Card | Freelance ID Demo",
};

export default async function CardDownloadPage({
  params,
}: {
  params: { token: string };
}) {
  const tokenState = await createCardDownloadService().getTokenState({
    token: params.token,
  });

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-50">
      <section className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Card download
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Freelance ID card
          </h1>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          {tokenState.status === "expired" ? (
            <p className="text-sm leading-6 text-neutral-200">
              This card download link expired. Contact an administrator if you
              need a new link.
            </p>
          ) : tokenState.status === "not_found" ? (
            <p className="text-sm leading-6 text-neutral-200">
              This card download link is invalid or no longer available.
            </p>
          ) : (
            <form
              action={`/api/card/${encodeURIComponent(params.token)}`}
              className="space-y-4"
              method="post"
            >
              <p className="text-sm leading-6 text-neutral-300">
                Re-enter the applicant date of birth to download the card.
              </p>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-neutral-100">
                  Date of birth
                </span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-50 outline-none focus:border-cyan-300"
                  name="dateOfBirth"
                  required
                  type="date"
                />
              </label>
              <button
                className="h-11 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200"
                type="submit"
              >
                Download card
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

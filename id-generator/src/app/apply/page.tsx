import type { Metadata } from "next";

import { ApplyForm } from "@/components/ApplyForm";

export const metadata: Metadata = {
  title: "Apply | Freelance ID Demo",
};

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-50">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Application
          </p>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            Start your Freelance ID demo application
          </h1>
          <p className="max-w-xl text-base leading-7 text-neutral-300">
            Submit basic contact details before the scan-quality step. This
            flow does not collect government identifiers and does not perform
            real KYC.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm sm:p-6">
          <ApplyForm />
        </div>
      </section>
    </main>
  );
}

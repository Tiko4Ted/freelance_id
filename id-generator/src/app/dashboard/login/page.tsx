import type { Metadata } from "next";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin Login | Freelance ID Demo",
};

export default function DashboardLoginPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-50">
      <section className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Sign in to review applications
          </h1>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

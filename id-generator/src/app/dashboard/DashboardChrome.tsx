import Link from "next/link";

import { signOutAction } from "./actions";

export function DashboardChrome({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link className="text-sm font-semibold text-neutral-50" href="/dashboard">
            Freelance ID Admin
          </Link>
          <form action={signOutAction}>
            <button
              className="h-9 rounded-md border border-neutral-700 px-3 text-sm text-neutral-100 transition hover:border-cyan-300"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="px-6 py-6">{children}</div>
    </main>
  );
}

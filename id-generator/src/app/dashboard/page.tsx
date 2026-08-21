import type { Metadata } from "next";
import Link from "next/link";

import { DashboardChrome } from "@/app/dashboard/DashboardChrome";
import {
  dashboardStatuses,
  listDashboardApplications,
  parseDashboardStatus,
} from "@/lib/admin/dashboard-queries";
import { requireAdminMfaSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Dashboard | Freelance ID",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdminMfaSession();
  const status = parseDashboardStatus(searchParams.status);
  const applications = await listDashboardApplications(status);

  return (
    <DashboardChrome>
      <section className="mx-auto w-full max-w-7xl h-full flex flex-col gap-6 p-6">
        <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
              Applications
            </p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Admin review queue
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Application filters">
            <FilterLink active={!status} href="/dashboard" label="All" />
            {dashboardStatuses.map((value) => (
              <FilterLink
                active={status === value}
                href={`/dashboard?status=${value}`}
                key={value}
                label={value}
              />
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-inner">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-300 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
              <tr>
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {applications.map((application) => (
                <tr className="bg-neutral-950" key={application.id}>
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-cyan-200 hover:text-cyan-100"
                      href={`/dashboard/${application.id}`}
                    >
                      {application.legalName}
                    </Link>
                    <p className="text-xs text-neutral-400">{application.email}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-200">
                    {application.status}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {formatDateTime(application.submittedAt)}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {application.reviewedAt
                      ? formatDateTime(application.reviewedAt)
                      : "Not reviewed"}
                  </td>
                </tr>
              ))}
              {applications.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-neutral-400" colSpan={4}>
                    No applications match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardChrome>
  );
}

function FilterLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={
        active
          ? "rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-neutral-950"
          : "rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-100 hover:border-cyan-300"
      }
      href={href}
    >
      {label}
    </Link>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

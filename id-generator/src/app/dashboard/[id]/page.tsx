import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardChrome } from "@/app/dashboard/DashboardChrome";
import { approveApplicationAction } from "@/app/dashboard/[id]/actions";
import { RejectForm } from "@/app/dashboard/[id]/RejectForm";
import { getDashboardApplicationDetail } from "@/lib/admin/dashboard-queries";
import { requireAdminMfaSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Application Detail | Freelance ID",
};

export default async function DashboardDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminMfaSession();
  const application = await getDashboardApplicationDetail(params.id);

  if (!application) {
    notFound();
  }

  const showThumbnails = process.env.SELFIE_RETENTION_MODE === "demo";

  return (
    <DashboardChrome>
      <section className="mx-auto max-w-7xl space-y-6">
        <Link className="text-sm text-cyan-200 hover:text-cyan-100" href="/dashboard">
          Back to applications
        </Link>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
                    Applicant
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-normal">
                    {application.legalName}
                  </h1>
                </div>
                <span className="w-fit rounded-md border border-neutral-700 px-3 py-1 text-sm text-neutral-200">
                  {application.status}
                </span>
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <Field label="Date of birth" value={formatDate(application.dateOfBirth)} />
                <Field label="Email" value={application.email} />
                <Field label="Phone" value={application.phone} />
                <Field label="Submitted" value={formatDateTime(application.submittedAt)} />
                <Field
                  label="Reviewed"
                  value={
                    application.reviewedAt
                      ? formatDateTime(application.reviewedAt)
                      : "Not reviewed"
                  }
                />
                <Field
                  label="Reviewed by"
                  value={application.reviewedByAdmin?.email ?? "Not reviewed"}
                />
                <Field
                  label="Freelance ID"
                  value={application.freelanceIdCode ?? "Not issued"}
                />
                <Field
                  label="Serial"
                  value={application.serialNumber ?? "Not issued"}
                />
              </dl>
              {application.rejectionReason ? (
                <div className="mt-5 rounded-md border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100">
                  <p className="font-medium">Rejection reason</p>
                  <p className="mt-1">{application.rejectionReason}</p>
                  {application.reapplyCooldownUntil ? (
                    <p className="mt-2">
                      Reapply cooldown until{" "}
                      {formatDate(application.reapplyCooldownUntil)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {application.status === "PENDING" ? (
              <div className="grid gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-5 sm:grid-cols-2">
                <form action={approveApplicationAction.bind(null, application.id)}>
                  <button
                    className="h-10 rounded-md bg-cyan-300 px-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200"
                    type="submit"
                  >
                    Approve
                  </button>
                </form>
                <RejectForm applicationId={application.id} />
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="text-lg font-semibold">Scan attempts</h2>
              <div className="mt-4 space-y-4">
                {application.scanAttempts.map((attempt) => (
                  <div
                    className="rounded-md border border-neutral-800 bg-neutral-950 p-4"
                    key={attempt.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-100">
                          Attempt {attempt.attemptNumber}: {attempt.detectionResult}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatDateTime(attempt.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-neutral-300">
                        Confidence:{" "}
                        {attempt.confidenceScore === null
                          ? "n/a"
                          : attempt.confidenceScore.toFixed(2)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-neutral-300">
                      Failure reason: {attempt.failureReason ?? "None"}
                    </p>
                    {showThumbnails && attempt.thumbnailKey ? (
                      <div className="mt-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={`Thumbnail for scan attempt ${attempt.attemptNumber}`}
                          className="h-40 w-40 rounded-md border border-neutral-800 object-cover"
                          src={`/api/admin/applications/${application.id}/scan-attempts/${attempt.id}/thumbnail`}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
                {application.scanAttempts.length === 0 ? (
                  <p className="text-sm text-neutral-400">
                    No scan attempts have been submitted.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="text-lg font-semibold">Audit log</h2>
              <div className="mt-4 overflow-hidden rounded-md border border-neutral-800">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">IP</th>
                      <th className="px-3 py-2 font-medium">User agent</th>
                      <th className="px-3 py-2 font-medium">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {application.auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-3 py-2 text-neutral-100">{log.action}</td>
                        <td className="px-3 py-2 text-neutral-300">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-3 py-2 text-neutral-300">
                          {log.ipAddress ?? "n/a"}
                        </td>
                        <td className="max-w-48 truncate px-3 py-2 text-neutral-300">
                          {log.userAgent ?? "n/a"}
                        </td>
                        <td className="max-w-56 truncate px-3 py-2 text-neutral-300">
                          {log.metadata ? JSON.stringify(log.metadata) : "{}"}
                        </td>
                      </tr>
                    ))}
                    {application.auditLogs.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-neutral-400" colSpan={5}>
                          No audit entries yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </section>
    </DashboardChrome>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-neutral-100">{value}</dd>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

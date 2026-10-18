import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentVerificationForm } from "@/components/DocumentVerificationForm";
import { ApplicationStatus, ScanResult } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Document verification | Freelance ID",
};

export default async function DocumentVerificationPage({
  searchParams,
}: {
  searchParams: { applicationId?: string };
}) {
  const applicationId = searchParams.applicationId;

  if (!applicationId) {
    return <MissingApplication />;
  }

  const application = await prisma.freelanceIdApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      countryOfResidence: true,
      documentType: true,
      documentIssuingCountry: true,
      documentVerifiedAt: true,
      scanAttempts: { select: { detectionResult: true } },
    },
  });

  if (!application) {
    return <MissingApplication />;
  }

  if (
    application.status === ApplicationStatus.PROCESSING ||
    application.status === ApplicationStatus.APPROVED ||
    application.status === ApplicationStatus.REJECTED
  ) {
    redirect(`/status?applicationId=${applicationId}`);
  }

  if (
    application.scanAttempts.some((attempt) => attempt.detectionResult === ScanResult.PASS)
  ) {
    redirect(`/payment?applicationId=${applicationId}`);
  }

  const initialValues = {
    countryOfResidence: application.countryOfResidence ?? "",
    documentType: application.documentType ?? "",
    documentIssuingCountry: application.documentIssuingCountry ?? "",
    documentScanConfirmed: Boolean(application.documentVerifiedAt),
    documentConsent: false,
  };

  return (
    <main className="min-h-[100dvh] w-full overflow-y-auto bg-[#050505] text-neutral-50 selection:bg-cyan-500/30">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <section className="hidden space-y-8 lg:block">
          <StepRail activeStep={2} />
          <div>
            <p className="text-sm font-medium text-cyan-300">Document checkpoint</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
              Confirm the document behind your professional identity.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-neutral-400">
              Tell us where you live and which document you are presenting. The guided frame prepares the next verification step without storing document contents.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-neutral-300">
            <TrustNote title="Private by design" text="No document number or image is retained in this demo." />
            <TrustNote title="One clear checkpoint" text="Select the document type so the frame matches its shape." />
          </div>
        </section>

        <section className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0a0a0a]/90 p-5 shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
          <div className="mb-6 lg:hidden">
            <StepRail activeStep={2} />
          </div>
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-cyan-300">
              STEP 2 OF 3
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">Document verification</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Choose your document and align it with the frame. This is a simulated document check for the portfolio workflow.
            </p>
          </div>
          <DocumentVerificationForm
            applicationId={application.id}
            initialValues={initialValues}
          />
        </section>
      </div>
    </main>
  );
}

function StepRail({ activeStep }: { activeStep: number }) {
  const steps = ["Profile", "Document", "Face"];

  return (
    <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === activeStep;
        const isComplete = stepNumber < activeStep;

        return (
          <li className="flex items-center gap-3" key={step}>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${isActive ? "border-cyan-300 bg-cyan-300 text-neutral-950" : isComplete ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200" : "border-neutral-700 text-neutral-500"}`}
            >
              {isComplete ? "✓" : stepNumber}
            </span>
            <span className={isActive ? "text-sm font-semibold text-white" : "text-sm text-neutral-500"}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function TrustNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-400">{text}</p>
    </div>
  );
}

function MissingApplication() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#050505] p-6 text-neutral-50">
      <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-red-950/30 p-5 text-center text-sm text-red-100">
        This verification session is missing an application. Return to the application form and start again.
      </div>
    </main>
  );
}

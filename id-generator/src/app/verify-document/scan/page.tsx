import type { Metadata } from "next";

import { DocumentScanForm } from "@/components/DocumentScanForm";
import {
  MissingApplicationCheckpoint,
  VerificationCheckpoint,
} from "@/components/VerificationCheckpoint";
import { ApplicationStatus, ScanResult } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getVerificationFlowState } from "@/lib/identity/verification-flow";
import { getDocumentType } from "@/lib/identity/document-verification";

export const metadata: Metadata = {
  title: "Scan document | Freelance ID",
};

export default async function DocumentScanPage({
  searchParams,
}: {
  searchParams: { applicationId?: string };
}) {
  const applicationId = searchParams.applicationId;

  if (!applicationId) {
    return <MissingApplicationCheckpoint />;
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
    return <MissingApplicationCheckpoint />;
  }

  const flowState = getVerificationFlowState({
    status: application.status,
    documentVerifiedAt: application.documentVerifiedAt,
    hasPassingScan: application.scanAttempts.some(
      (attempt) => attempt.detectionResult === ScanResult.PASS,
    ),
  });

  if (flowState === "status") {
    return (
      <VerificationCheckpoint
        actionHref={`/status?applicationId=${applicationId}`}
        actionLabel="View application status"
        description={statusDescription(application.status)}
        eyebrow="Application status"
        title="This verification step is already complete."
      />
    );
  }

  if (flowState === "payment") {
    return (
      <VerificationCheckpoint
        actionHref={`/payment?applicationId=${applicationId}`}
        actionLabel="Continue to payment"
        description="Your document and facial verification are complete. Continue to the payment step whenever you are ready."
        eyebrow="Verification complete"
        title="Your application is ready for payment."
      />
    );
  }

  if (flowState === "facial") {
    return (
      <VerificationCheckpoint
        actionHref={`/scan?applicationId=${applicationId}`}
        actionLabel="Continue to facial verification"
        description="Your document details are saved. Continue to the facial verification step when you are ready."
        details={[
          { label: "Residence", value: application.countryOfResidence ?? "Not provided" },
          { label: "Document", value: formatDocumentType(application.documentType) },
          { label: "Issuing country", value: application.documentIssuingCountry ?? "Not provided" },
        ]}
        eyebrow="Document verified"
        title="Your document checkpoint is complete."
      />
    );
  }

  if (
    !application.countryOfResidence ||
    !application.documentType ||
    !application.documentIssuingCountry ||
    !getDocumentType(application.documentType)
  ) {
    return (
      <VerificationCheckpoint
        actionHref={`/verify-document?applicationId=${applicationId}`}
        actionLabel="Enter document details"
        description="Choose your residence, document type, and issuing country before opening the document camera."
        eyebrow="Document details needed"
        title="Complete the document details first."
      />
    );
  }

  return (
    <main className="min-h-[100dvh] w-full overflow-y-auto bg-[#050505] text-neutral-50 selection:bg-cyan-500/30">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
        <section className="hidden space-y-8 lg:block">
          <StepRail activeStep={2} />
          <div>
            <p className="text-sm font-medium text-cyan-300">Document scan</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
              Put the right document in view.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-neutral-400">
              Your choices are confirmed. The camera now has the full workspace so you can see exactly what you are aligning.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-neutral-300">
            <TrustNote title="Clear before capture" text="Review the selected document details above the camera before you align anything." />
            <TrustNote title="Demo capture" text="This frame simulates alignment only. No document contents are read or stored." />
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0a0a0a]/90 p-5 shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
          <div className="mb-6 lg:hidden">
            <StepRail activeStep={2} />
          </div>
          <DocumentScanForm
            applicationId={application.id}
            initialValues={{
              countryOfResidence: application.countryOfResidence,
              documentType: application.documentType,
              documentIssuingCountry: application.documentIssuingCountry,
              documentScanConfirmed: false,
              documentConsent: false,
            }}
          />
        </section>
      </div>
    </main>
  );
}

function statusDescription(status: ApplicationStatus): string {
  if (status === ApplicationStatus.PROCESSING) {
    return "Payment has been received and your application is being processed.";
  }

  if (status === ApplicationStatus.APPROVED) {
    return "Your application has already been approved. Open the status page to view the latest result.";
  }

  return "This application has already reached a final decision. Open the status page to view the latest result.";
}

function formatDocumentType(value: string | null): string {
  if (!value) {
    return "Not provided";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

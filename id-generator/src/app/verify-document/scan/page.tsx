import type { Metadata } from "next";

import { DocumentScanForm } from "@/components/DocumentScanForm";
import {
  MissingApplicationCheckpoint,
  VerificationCheckpoint,
} from "@/components/VerificationCheckpoint";
import { ApplicationStatus, ScanResult } from "@/generated/prisma/client";
import { getDocumentType } from "@/lib/identity/document-verification";
import { prisma } from "@/lib/db";
import { getVerificationFlowState } from "@/lib/identity/verification-flow";

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
    <main className="flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-[#050505] text-neutral-50 selection:bg-cyan-500/30">
      <div className="w-full max-w-3xl px-4 py-6 sm:py-10">
        <section className="mx-auto w-full rounded-3xl border border-white/10 bg-[#0a0a0a]/90 p-4 shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
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

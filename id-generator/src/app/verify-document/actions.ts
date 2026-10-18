"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

import type { DocumentVerificationFormState } from "@/app/verify-document/form-state";
import { validateDocumentVerificationForm } from "@/lib/validation/document-verification";

export async function submitDocumentVerification(
  _previousState: DocumentVerificationFormState,
  formData: FormData,
): Promise<DocumentVerificationFormState> {
  const applicationId = readString(formData, "applicationId");
  const rawForm = {
    countryOfResidence: readString(formData, "countryOfResidence"),
    documentType: readString(formData, "documentType"),
    documentIssuingCountry: readString(formData, "documentIssuingCountry"),
    documentScanConfirmed: readString(formData, "documentScanConfirmed"),
    documentConsent: readString(formData, "documentConsent"),
  } as const;
  const values = {
    countryOfResidence: rawForm.countryOfResidence,
    documentType: rawForm.documentType,
    documentIssuingCountry: rawForm.documentIssuingCountry,
    documentScanConfirmed: rawForm.documentScanConfirmed === "on",
    documentConsent: rawForm.documentConsent === "on",
  };
  const validation = validateDocumentVerificationForm(rawForm);

  if (!applicationId) {
    return { errors: { form: ["This application could not be identified."] }, values };
  }

  if (!validation.success) {
    return { errors: validation.errors, values };
  }

  const application = await prisma.freelanceIdApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });

  if (!application) {
    return { errors: { form: ["Application not found. Start again from the application form."] }, values };
  }

  if (application.status !== "PENDING") {
    return { errors: { form: ["This application is no longer awaiting verification."] }, values };
  }

  await prisma.freelanceIdApplication.update({
    where: { id: application.id },
    data: {
      countryOfResidence: validation.data.countryOfResidence,
      documentType: validation.data.documentType,
      documentIssuingCountry: validation.data.documentIssuingCountry,
      documentVerifiedAt: new Date(),
    },
  });

  redirect(`/scan?applicationId=${application.id}`);
}

function readString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

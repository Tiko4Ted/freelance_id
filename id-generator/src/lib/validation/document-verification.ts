import { z } from "zod";

import {
  documentTypes,
  residenceCountries,
} from "@/lib/identity/document-verification";

const countryValues = residenceCountries.map((country) => country.value) as [
  string,
  ...string[],
];
const documentTypeValues = documentTypes.map(
  (documentType) => documentType.value,
) as [string, ...string[]];

const rawDocumentVerificationSchema = z.object({
  countryOfResidence: z.enum(countryValues, {
    error: "Select your country of residence.",
  }),
  documentType: z.enum(documentTypeValues, {
    error: "Select the document you will use.",
  }),
  documentIssuingCountry: z.enum(countryValues, {
    error: "Select the document issuing country.",
  }),
  documentScanConfirmed: z.literal("on", {
    error: "Complete the document alignment step before continuing.",
  }),
  documentConsent: z.literal("on", {
    error: "Confirm that the document belongs to you.",
  }),
});

export type DocumentVerificationFieldName =
  | "countryOfResidence"
  | "documentType"
  | "documentIssuingCountry"
  | "documentScanConfirmed"
  | "documentConsent";

export type DocumentVerificationErrors = Partial<
  Record<DocumentVerificationFieldName | "form", string[]>
>;

export type DocumentVerificationValues = {
  countryOfResidence: string;
  documentType: string;
  documentIssuingCountry: string;
  documentScanConfirmed: boolean;
  documentConsent: boolean;
};

export function validateDocumentVerificationForm(
  rawForm: Record<DocumentVerificationFieldName, string>,
):
  | { success: true; data: Omit<DocumentVerificationValues, "documentScanConfirmed" | "documentConsent"> }
  | { success: false; errors: DocumentVerificationErrors } {
  const parsed = rawDocumentVerificationSchema.safeParse(rawForm);

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  return {
    success: true,
    data: {
      countryOfResidence: parsed.data.countryOfResidence,
      documentType: parsed.data.documentType,
      documentIssuingCountry: parsed.data.documentIssuingCountry,
    },
  };
}

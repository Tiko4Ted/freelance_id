import type {
  DocumentVerificationErrors,
  DocumentVerificationValues,
} from "@/lib/validation/document-verification";

export type DocumentVerificationFormState = {
  errors: DocumentVerificationErrors;
  values: DocumentVerificationValues;
};

export const initialDocumentVerificationFormState: DocumentVerificationFormState = {
  errors: {},
  values: {
    countryOfResidence: "",
    documentType: "",
    documentIssuingCountry: "",
    documentScanConfirmed: false,
    documentConsent: false,
  },
};

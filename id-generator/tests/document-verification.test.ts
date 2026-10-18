import { describe, expect, it } from "vitest";

import {
  validateDocumentDetails,
  validateDocumentVerificationForm,
} from "@/lib/validation/document-verification";

describe("document verification form validation", () => {
  it("accepts document details before the scan step", () => {
    const result = validateDocumentDetails({
      countryOfResidence: "KE",
      documentType: "passport",
      documentIssuingCountry: "KE",
    });

    expect(result).toEqual({
      success: true,
      data: {
        countryOfResidence: "KE",
        documentType: "passport",
        documentIssuingCountry: "KE",
      },
    });
  });

  it("blocks the scan step until all document details are selected", () => {
    const result = validateDocumentDetails({
      countryOfResidence: "KE",
      documentType: "",
      documentIssuingCountry: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors.documentType).toBeDefined();
    expect(result.errors.documentIssuingCountry).toBeDefined();
  });

  it("accepts a complete document verification submission", () => {
    const result = validateDocumentVerificationForm({
      countryOfResidence: "KE",
      documentType: "passport",
      documentIssuingCountry: "KE",
      documentScanConfirmed: "on",
      documentConsent: "on",
    });

    expect(result).toEqual({
      success: true,
      data: {
        countryOfResidence: "KE",
        documentType: "passport",
        documentIssuingCountry: "KE",
      },
    });
  });

  it("requires document alignment and consent before continuing", () => {
    const result = validateDocumentVerificationForm({
      countryOfResidence: "KE",
      documentType: "national_id",
      documentIssuingCountry: "KE",
      documentScanConfirmed: "",
      documentConsent: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors.documentScanConfirmed?.[0]).toBe(
      "Complete the document alignment step before continuing.",
    );
    expect(result.errors.documentConsent?.[0]).toBe(
      "Confirm that the document belongs to you.",
    );
  });

  it("rejects unsupported residence and issuing countries", () => {
    const result = validateDocumentVerificationForm({
      countryOfResidence: "XX",
      documentType: "drivers_license",
      documentIssuingCountry: "XX",
      documentScanConfirmed: "on",
      documentConsent: "on",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors.countryOfResidence).toBeDefined();
    expect(result.errors.documentIssuingCountry).toBeDefined();
  });
});

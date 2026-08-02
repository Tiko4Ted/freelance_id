import { describe, expect, it } from "vitest";

import {
  validateApplicationFormData,
  type ApplicationFormErrors,
} from "@/lib/validation/application-form";

const now = new Date(Date.UTC(2026, 7, 2));

describe("application form validation", () => {
  it("rejects an empty legal name with the inline field error", () => {
    const result = validateApplicationFormData(
      validRawForm({ legalName: "" }),
      now,
    );

    expectError(result, "legalName").toBe("Legal name is required.");
  });

  it("rejects an invalid email with the inline field error", () => {
    const result = validateApplicationFormData(
      validRawForm({ email: "not-an-email" }),
      now,
    );

    expectError(result, "email").toBe("Enter a valid email address.");
  });

  it("rejects an invalid date of birth with the inline field error", () => {
    const result = validateApplicationFormData(
      validRawForm({ dateOfBirth: "2026-02-31" }),
      now,
    );

    expectError(result, "dateOfBirth").toBe("Enter a valid date of birth.");
  });

  it("rejects applicants outside the allowed age range", () => {
    const result = validateApplicationFormData(
      validRawForm({ dateOfBirth: "2015-01-01" }),
      now,
    );

    expectError(result, "dateOfBirth").toBe(
      "Applicant age must be between 16 and 100 years.",
    );
  });
});

function validRawForm(
  overrides: Partial<Parameters<typeof validateApplicationFormData>[0]>,
): Parameters<typeof validateApplicationFormData>[0] {
  return {
    legalName: "Mary Ann Smith",
    dateOfBirth: "1990-05-20",
    email: "mary@example.com",
    phone: "+1 555 123 4567",
    consent: "on",
    ...overrides,
  };
}

function expectError(
  result: ReturnType<typeof validateApplicationFormData>,
  field: keyof ApplicationFormErrors,
) {
  if (result.success) {
    throw new Error(`Expected ${String(field)} to fail validation.`);
  }

  return expect(result.errors[field]?.[0]);
}

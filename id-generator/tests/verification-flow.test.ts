import { describe, expect, it } from "vitest";

import { ApplicationStatus } from "@/generated/prisma/client";
import { getVerificationFlowState } from "@/lib/identity/verification-flow";

const verifiedAt = new Date("2026-10-18T12:00:00.000Z");

describe("verification flow state", () => {
  it("starts at document verification when document details are missing", () => {
    expect(
      getVerificationFlowState({
        status: ApplicationStatus.PENDING,
        documentVerifiedAt: null,
        hasPassingScan: false,
      }),
    ).toBe("document");
  });

  it("opens facial verification after the document checkpoint", () => {
    expect(
      getVerificationFlowState({
        status: ApplicationStatus.PENDING,
        documentVerifiedAt: verifiedAt,
        hasPassingScan: false,
      }),
    ).toBe("facial");
  });

  it("shows payment after facial verification without redirecting backward", () => {
    expect(
      getVerificationFlowState({
        status: ApplicationStatus.PENDING,
        documentVerifiedAt: verifiedAt,
        hasPassingScan: true,
      }),
    ).toBe("payment");
  });

  it.each([
    ApplicationStatus.PROCESSING,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
  ])("keeps %s applications at the status checkpoint", (status) => {
    expect(
      getVerificationFlowState({
        status,
        documentVerifiedAt: verifiedAt,
        hasPassingScan: true,
      }),
    ).toBe("status");
  });
});

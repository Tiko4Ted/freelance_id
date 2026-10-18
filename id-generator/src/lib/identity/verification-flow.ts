import { ApplicationStatus } from "@/generated/prisma/client";

export type VerificationFlowState =
  | "document"
  | "facial"
  | "payment"
  | "status";

export function getVerificationFlowState(input: {
  status: ApplicationStatus;
  documentVerifiedAt: Date | null;
  hasPassingScan: boolean;
}): VerificationFlowState {
  if (
    input.status === ApplicationStatus.PROCESSING ||
    input.status === ApplicationStatus.APPROVED ||
    input.status === ApplicationStatus.REJECTED
  ) {
    return "status";
  }

  if (!input.documentVerifiedAt) {
    return "document";
  }

  if (input.hasPassingScan) {
    return "payment";
  }

  return "facial";
}

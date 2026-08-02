import type { GeneratedFreelanceIdentity } from "@/lib/services/id-generation-service";

export type QueuedSyncAttempt = {
  idempotencyKey: string;
  status: "QUEUED";
};

export class SyncService {
  createApprovalSyncAttempt(input: {
    applicationId: string;
    generatedIdentity: GeneratedFreelanceIdentity;
  }): QueuedSyncAttempt {
    return {
      idempotencyKey: [
        "approved-identity",
        input.applicationId,
        input.generatedIdentity.freelanceIdCode,
      ].join(":"),
      status: "QUEUED",
    };
  }
}

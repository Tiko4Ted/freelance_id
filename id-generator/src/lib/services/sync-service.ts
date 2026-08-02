import type { GeneratedFreelanceIdentity } from "@/lib/services/id-generation-service";

export type PendingSyncAttempt = {
  idempotencyKey: string;
  status: "PENDING";
  payload: {
    freelanceIdCode: string;
    serialNumber: string;
    legalName: string;
    dateOfBirth: string;
    isActive: boolean;
  };
};

export type SyncAttemptResult = {
  status: "SUCCESS" | "FAILED";
  responseCode: number | null;
};

export class SyncService {
  createApprovalSyncAttempt(input: {
    applicationId: string;
    legalName: string;
    dateOfBirth: Date;
    generatedIdentity: GeneratedFreelanceIdentity;
  }): PendingSyncAttempt {
    return {
      idempotencyKey: [
        "approved-identity",
        input.applicationId,
        input.generatedIdentity.freelanceIdCode,
      ].join(":"),
      status: "PENDING",
      payload: {
        freelanceIdCode: input.generatedIdentity.freelanceIdCode,
        serialNumber: input.generatedIdentity.serialNumber,
        legalName: input.legalName,
        dateOfBirth: input.dateOfBirth.toISOString().slice(0, 10),
        isActive: true,
      },
    };
  }

  async flushApprovalSyncAttempt(
    syncAttempt: PendingSyncAttempt,
  ): Promise<SyncAttemptResult> {
    const endpoint = process.env.MAIN_APP_SYNC_URL;
    const bearerToken = process.env.MAIN_APP_SYNC_BEARER_TOKEN;

    if (!endpoint || !bearerToken) {
      return { status: "FAILED", responseCode: null };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: syncAttempt.idempotencyKey,
          ...syncAttempt.payload,
        }),
      });

      return {
        status: response.ok ? "SUCCESS" : "FAILED",
        responseCode: response.status,
      };
    } catch {
      return { status: "FAILED", responseCode: null };
    }
  }
}

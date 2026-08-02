import { ApplicationStatus, type Prisma } from "@/generated/prisma/client";
import type { AuditRequestContext } from "@/lib/audit/request-context";
import { InMemoryDomainEventBus } from "@/lib/events/domain-event-bus";
import type {
  AdminReviewApplicationRecord,
  AdminReviewRepository,
} from "@/lib/repositories/admin-review-repository";
import { PrismaAdminReviewRepository } from "@/lib/repositories/admin-review-repository";
import { AdminReviewService } from "@/lib/services/admin-review-service";
import { AuditService } from "@/lib/services/audit-service";
import type { PreparedCard } from "@/lib/services/card-service";
import type { GeneratedFreelanceIdentity } from "@/lib/services/id-generation-service";
import type {
  PendingSyncAttempt,
  SyncAttemptResult,
} from "@/lib/services/sync-service";
import { describe, expect, it } from "vitest";

const context: AuditRequestContext = {
  ipAddress: "203.0.113.10",
  userAgent: "vitest",
  timestamp: new Date("2026-08-02T12:00:00Z"),
};

describe("AdminReviewService", () => {
  it("blocks rejection without a reason", async () => {
    const repository = new FakeAdminReviewRepository();
    const service = new AdminReviewService(
      repository,
      new FakeIdentityGenerationService([]),
      new FakeSyncService([]),
      new InMemoryDomainEventBus(),
      new AuditService(repository),
      new FakeCardService([]),
    );

    await expect(
      service.reject({
        applicationId: "application-1",
        adminId: "admin-1",
        rejectionReason: "   ",
        context,
      }),
    ).resolves.toEqual({
      status: "invalid",
      message: "A rejection reason is required.",
    });
    expect(repository.rejections).toHaveLength(0);
  });

  it("generates IDs before creating the sync attempt, approval transaction, and non-blocking sync call", async () => {
    const calls: string[] = [];
    const repository = new FakeAdminReviewRepository(calls);
    const service = new AdminReviewService(
      repository,
      new FakeIdentityGenerationService(calls),
      new FakeSyncService(calls),
      new InMemoryDomainEventBus(),
      new AuditService(repository),
      new FakeCardService(calls),
    );

    await expect(
      service.approve({
        applicationId: "application-1",
        adminId: "admin-1",
        context,
      }),
    ).resolves.toEqual({ status: "ok" });

    expect(calls).toEqual([
      "find-application",
      "generate-id",
      "prepare-card",
      "create-sync-attempt",
      "approval-transaction",
      "flush-sync",
      "record-sync-result",
    ]);
    expect(repository.approvals[0]).toMatchObject({
      adminId: "admin-1",
      generatedIdentity: {
        freelanceIdCode: "FL-MARY-SMITH-000001",
        serialNumber: "SER-SMITH-000001",
      },
      syncAttempt: {
        idempotencyKey:
          "approved-identity:application-1:FL-MARY-SMITH-000001",
        status: "PENDING",
        payload: {
          freelanceIdCode: "FL-MARY-SMITH-000001",
          serialNumber: "SER-SMITH-000001",
          legalName: "Mary Ann Smith",
          dateOfBirth: "1990-05-20",
          isActive: true,
        },
      },
      preparedCard: {
        cardObjectKey: "cards/application-1/FL-MARY-SMITH-000001.png",
        cardTokenHash: "hashed-card-token",
        cardTokenExpiresAt: new Date("2026-08-04T12:00:00Z"),
      },
      auditLog: {
        applicationId: "application-1",
        adminId: "admin-1",
        action: "application.approved",
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
        timestamp: context.timestamp,
      },
      context,
    });
    expect(repository.syncResults[0]).toMatchObject({
      idempotencyKey:
        "approved-identity:application-1:FL-MARY-SMITH-000001",
      result: { status: "FAILED", responseCode: 503 },
    });
  });

  it("stores rejection review data and emits application.rejected", async () => {
    const repository = new FakeAdminReviewRepository();
    const eventBus = new InMemoryDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe("application.rejected", async (event) => {
      events.push(`${event.payload.applicationId}:${event.payload.rejectionReason}`);
    });
    const service = new AdminReviewService(
      repository,
      new FakeIdentityGenerationService([]),
      new FakeSyncService([]),
      eventBus,
      new AuditService(repository),
      new FakeCardService([]),
    );

    await expect(
      service.reject({
        applicationId: "application-1",
        adminId: "admin-1",
        rejectionReason: "Low confidence scan",
        context,
      }),
    ).resolves.toEqual({ status: "ok" });

    expect(repository.rejections[0]).toMatchObject({
      adminId: "admin-1",
      rejectionReason: "Low confidence scan",
      reapplyCooldownUntil: new Date("2026-09-01T12:00:00Z"),
      auditLog: {
        applicationId: "application-1",
        adminId: "admin-1",
        action: "application.rejected",
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
        timestamp: context.timestamp,
      },
      context,
    });
    expect(events).toEqual(["application-1:Low confidence scan"]);
  });

  it("keeps concurrent approve-to-card generation to one persisted approval", async () => {
    const repository = new OneWinnerAdminReviewRepository();
    const cardService = new SequencedCardService();
    const eventBus = new InMemoryDomainEventBus();
    const approvedEvents: string[] = [];
    eventBus.subscribe("application.approved", async (event) => {
      approvedEvents.push(
        `${event.payload.freelanceIdCode}:${event.payload.cardToken}`,
      );
    });
    const service = new AdminReviewService(
      repository,
      new SequencedIdentityGenerationService(),
      new FakeSyncService([]),
      eventBus,
      new AuditService(repository),
      cardService,
    );

    const results = await Promise.allSettled([
      service.approve({
        applicationId: "application-1",
        adminId: "admin-1",
        context,
      }),
      service.approve({
        applicationId: "application-1",
        adminId: "admin-1",
        context,
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(repository.approvals).toHaveLength(1);
    expect(repository.approvals[0].generatedIdentity.freelanceIdCode).toBe(
      "FL-MARY-SMITH-000001",
    );
    expect(repository.approvals[0].preparedCard.cardTokenHash).toBe(
      "hashed-token-1",
    );
    expect(cardService.deletedKeys).toEqual([
      "cards/application-1/FL-MARY-SMITH-000002.png",
    ]);
    expect(approvedEvents).toEqual(["FL-MARY-SMITH-000001:raw-token-1"]);
  });
});

describe("PrismaAdminReviewRepository audit writes", () => {
  it("creates approval audit and sync attempt records in the approval transaction", async () => {
    const fakePrisma = new FakePrismaTransaction();
    const repository = new PrismaAdminReviewRepository(fakePrisma.asPrisma());

    await repository.approveApplication({
      applicationId: "application-1",
      adminId: "admin-1",
      generatedIdentity: {
        freelanceIdCode: "FL-MARY-SMITH-000001",
        serialNumber: "SER-SMITH-000001",
        counter: 1,
      },
      syncAttempt: {
        idempotencyKey:
          "approved-identity:application-1:FL-MARY-SMITH-000001",
        status: "PENDING",
        payload: {
          freelanceIdCode: "FL-MARY-SMITH-000001",
          serialNumber: "SER-SMITH-000001",
          legalName: "Mary Ann Smith",
          dateOfBirth: "1990-05-20",
          isActive: true,
        },
      },
      preparedCard: {
        cardObjectKey: "cards/application-1/FL-MARY-SMITH-000001.png",
        cardTokenHash: "hashed-card-token",
        cardTokenExpiresAt: new Date("2026-08-04T12:00:00Z"),
      },
      auditLog: {
        applicationId: "application-1",
        adminId: "admin-1",
        action: "application.approved",
        metadata: {
          freelanceIdCode: "FL-MARY-SMITH-000001",
          serialNumber: "SER-SMITH-000001",
          syncIdempotencyKey:
            "approved-identity:application-1:FL-MARY-SMITH-000001",
        },
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
        timestamp: context.timestamp,
      },
      context,
    });

    expect(fakePrisma.applicationUpdates[0]).toMatchObject({
      where: { id: "application-1", status: ApplicationStatus.PENDING },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewedByAdminId: "admin-1",
      },
    });
    expect(fakePrisma.auditCreates[0]).toMatchObject({
      applicationId: "application-1",
      adminId: "admin-1",
      action: "application.approved",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
      timestamp: context.timestamp,
      metadata: {
        freelanceIdCode: "FL-MARY-SMITH-000001",
        serialNumber: "SER-SMITH-000001",
        syncIdempotencyKey:
          "approved-identity:application-1:FL-MARY-SMITH-000001",
      },
    });
    expect(fakePrisma.syncCreates[0]).toMatchObject({
      applicationId: "application-1",
      idempotencyKey:
        "approved-identity:application-1:FL-MARY-SMITH-000001",
      status: "PENDING",
      attemptedAt: context.timestamp,
    });
  });

  it("creates rejection audit records with required request fields", async () => {
    const fakePrisma = new FakePrismaTransaction();
    const repository = new PrismaAdminReviewRepository(fakePrisma.asPrisma());

    await repository.rejectApplication({
      applicationId: "application-1",
      adminId: "admin-1",
      rejectionReason: "Low confidence scan",
      reapplyCooldownUntil: new Date("2026-09-01T12:00:00Z"),
      auditLog: {
        applicationId: "application-1",
        adminId: "admin-1",
        action: "application.rejected",
        metadata: {
          rejectionReason: "Low confidence scan",
          reapplyCooldownUntil: "2026-09-01T12:00:00.000Z",
        },
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
        timestamp: context.timestamp,
      },
      context,
    });

    expect(fakePrisma.auditCreates[0]).toMatchObject({
      applicationId: "application-1",
      adminId: "admin-1",
      action: "application.rejected",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
      timestamp: context.timestamp,
      metadata: {
        rejectionReason: "Low confidence scan",
        reapplyCooldownUntil: "2026-09-01T12:00:00.000Z",
      },
    });
  });
});

describe("AuditService", () => {
  it("logs thumbnail view audit records with admin and request fields", async () => {
    const repository = new FakeAdminReviewRepository();
    const service = new AuditService(repository);

    await service.log({
      applicationId: "application-1",
      adminId: "admin-1",
      action: "thumbnail.viewed",
      metadata: { attemptId: "attempt-1" },
      context,
    });

    expect(repository.auditLogs[0]).toEqual({
      applicationId: "application-1",
      adminId: "admin-1",
      action: "thumbnail.viewed",
      metadata: { attemptId: "attempt-1" },
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
      timestamp: context.timestamp,
    });
  });
});

class FakeAdminReviewRepository implements AdminReviewRepository {
  approvals: Parameters<AdminReviewRepository["approveApplication"]>[0][] = [];
  rejections: Parameters<AdminReviewRepository["rejectApplication"]>[0][] = [];
  auditLogs: Parameters<AdminReviewRepository["logAudit"]>[0][] = [];
  syncResults: Parameters<AdminReviewRepository["recordSyncAttemptResult"]>[0][] = [];

  constructor(private readonly calls: string[] = []) {}

  async findApplicationForReview(): Promise<AdminReviewApplicationRecord | null> {
    this.calls.push("find-application");
    return {
      id: "application-1",
      legalName: "Mary Ann Smith",
      dateOfBirth: new Date("1990-05-20T00:00:00Z"),
      email: "mary@example.com",
      status: ApplicationStatus.PENDING,
    };
  }

  async approveApplication(
    input: Parameters<AdminReviewRepository["approveApplication"]>[0],
  ): Promise<void> {
    this.calls.push("approval-transaction");
    this.approvals.push(input);
  }

  async rejectApplication(
    input: Parameters<AdminReviewRepository["rejectApplication"]>[0],
  ): Promise<void> {
    this.rejections.push(input);
  }

  async logAudit(
    input: Parameters<AdminReviewRepository["logAudit"]>[0],
  ): Promise<void> {
    this.auditLogs.push(input);
  }

  async recordSyncAttemptResult(
    input: Parameters<AdminReviewRepository["recordSyncAttemptResult"]>[0],
  ): Promise<void> {
    this.calls.push("record-sync-result");
    this.syncResults.push(input);
  }
}

class FakeIdentityGenerationService {
  constructor(private readonly calls: string[]) {}

  async generateForLegalName(): Promise<GeneratedFreelanceIdentity> {
    this.calls.push("generate-id");
    return {
      freelanceIdCode: "FL-MARY-SMITH-000001",
      serialNumber: "SER-SMITH-000001",
      counter: 1,
    };
  }
}

class FakeSyncService {
  constructor(private readonly calls: string[]) {}

  createApprovalSyncAttempt(input: {
    generatedIdentity: GeneratedFreelanceIdentity;
  }): PendingSyncAttempt {
    this.calls.push("create-sync-attempt");
    return {
      idempotencyKey:
        "approved-identity:application-1:FL-MARY-SMITH-000001",
      status: "PENDING",
      payload: {
        freelanceIdCode: input.generatedIdentity.freelanceIdCode,
        serialNumber: input.generatedIdentity.serialNumber,
        legalName: "Mary Ann Smith",
        dateOfBirth: "1990-05-20",
        isActive: true,
      },
    };
  }

  async flushApprovalSyncAttempt(): Promise<SyncAttemptResult> {
    this.calls.push("flush-sync");
    return { status: "FAILED", responseCode: 503 };
  }
}

class FakeCardService {
  constructor(private readonly calls: string[]) {}

  async prepareApprovedCard(): Promise<PreparedCard> {
    this.calls.push("prepare-card");
    return {
      cardObjectKey: "cards/application-1/FL-MARY-SMITH-000001.png",
      cardToken: "raw-card-token",
      cardTokenHash: "hashed-card-token",
      cardTokenExpiresAt: new Date("2026-08-04T12:00:00Z"),
    };
  }

  async deleteCard(): Promise<void> {
    return undefined;
  }
}

class SequencedIdentityGenerationService {
  private counter = 0;

  async generateForLegalName(): Promise<GeneratedFreelanceIdentity> {
    this.counter += 1;
    return {
      freelanceIdCode: `FL-MARY-SMITH-${this.counter.toString().padStart(6, "0")}`,
      serialNumber: `SER-SMITH-${this.counter.toString().padStart(6, "0")}`,
      counter: this.counter,
    };
  }
}

class SequencedCardService {
  deletedKeys: string[] = [];

  async prepareApprovedCard(input: {
    applicationId: string;
    freelanceIdCode: string;
  }): Promise<PreparedCard> {
    const sequence = input.freelanceIdCode.endsWith("000001") ? "1" : "2";
    return {
      cardObjectKey: `cards/${input.applicationId}/${input.freelanceIdCode}.png`,
      cardToken: `raw-token-${sequence}`,
      cardTokenHash: `hashed-token-${sequence}`,
      cardTokenExpiresAt: new Date("2026-08-04T12:00:00Z"),
    };
  }

  async deleteCard(cardObjectKey: string): Promise<void> {
    this.deletedKeys.push(cardObjectKey);
  }
}

class OneWinnerAdminReviewRepository extends FakeAdminReviewRepository {
  private persisted = false;

  override async approveApplication(
    input: Parameters<AdminReviewRepository["approveApplication"]>[0],
  ): Promise<void> {
    if (this.persisted) {
      throw new Error("Application is no longer pending review.");
    }

    this.persisted = true;
    await super.approveApplication(input);
  }
}

class FakePrismaTransaction {
  applicationUpdates: unknown[] = [];
  auditCreates: unknown[] = [];
  syncCreates: unknown[] = [];

  asPrisma() {
    return {
      $transaction: async (callback: (tx: unknown) => Promise<void>) =>
        callback(this.tx()),
    } as never;
  }

  private tx() {
    return {
      freelanceIdApplication: {
        updateMany: async (input: unknown) => {
          this.applicationUpdates.push(input);
          return { count: 1 };
        },
      },
      auditLog: {
        create: async (input: { data: Prisma.InputJsonObject }) => {
          this.auditCreates.push(input.data);
        },
      },
      syncAttempt: {
        create: async (input: { data: unknown }) => {
          this.syncCreates.push(input.data);
        },
      },
    };
  }
}

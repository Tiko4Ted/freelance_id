import type { AuditRequestContext } from "@/lib/audit/request-context";
import type { DomainEventBus } from "@/lib/events/domain-event-bus";
import type {
  AdminReviewApplicationRecord,
  AdminReviewRepository,
} from "@/lib/repositories/admin-review-repository";
import type { GeneratedFreelanceIdentity } from "@/lib/services/id-generation-service";
import type { AuditService } from "@/lib/services/audit-service";
import type { PreparedCard } from "@/lib/services/card-service";
import type { SyncService } from "@/lib/services/sync-service";

const REAPPLY_COOLDOWN_DAYS = 30;

export interface IdentityGenerationService {
  generateForLegalName(legalName: string): Promise<GeneratedFreelanceIdentity>;
}

export interface ApprovedCardService {
  prepareApprovedCard(input: {
    applicationId: string;
    legalName: string;
    dateOfBirth: Date;
    freelanceIdCode: string;
    serialNumber: string;
    issueDate: Date;
  }): Promise<PreparedCard>;
  deleteCard(cardObjectKey: string): Promise<void>;
}

export type AdminReviewResult =
  | { status: "ok" }
  | { status: "not_found" }
  | { status: "invalid"; message: string };

export class AdminReviewService {
  constructor(
    private readonly repository: AdminReviewRepository,
    private readonly idGenerationService: IdentityGenerationService,
    private readonly syncService: SyncService,
    private readonly eventBus: DomainEventBus,
    private readonly auditService: AuditService,
    private readonly cardService: ApprovedCardService,
  ) {}

  async approve(input: {
    applicationId: string;
    adminId: string;
    context: AuditRequestContext;
  }): Promise<AdminReviewResult> {
    const application = await this.repository.findApplicationForReview(
      input.applicationId,
    );
    const pendingCheck = this.requirePendingApplication(application);
    if (pendingCheck) {
      return pendingCheck;
    }
    if (!application) {
      return { status: "not_found" };
    }

    const generatedIdentity =
      await this.idGenerationService.generateForLegalName(
        application.legalName,
      );
    const preparedCard = await this.cardService.prepareApprovedCard({
      applicationId: application.id,
      legalName: application.legalName,
      dateOfBirth: application.dateOfBirth,
      freelanceIdCode: generatedIdentity.freelanceIdCode,
      serialNumber: generatedIdentity.serialNumber,
      issueDate: input.context.timestamp,
    });
    const syncAttempt = this.syncService.createApprovalSyncAttempt({
      applicationId: application.id,
      legalName: application.legalName,
      dateOfBirth: application.dateOfBirth,
      generatedIdentity,
    });

    try {
      await this.repository.approveApplication({
        applicationId: application.id,
        adminId: input.adminId,
        generatedIdentity,
        preparedCard: {
          cardObjectKey: preparedCard.cardObjectKey,
          cardTokenHash: preparedCard.cardTokenHash,
          cardTokenExpiresAt: preparedCard.cardTokenExpiresAt,
        },
        syncAttempt,
        auditLog: this.auditService.createEntry({
          applicationId: application.id,
          adminId: input.adminId,
          action: "application.approved",
          metadata: {
            freelanceIdCode: generatedIdentity.freelanceIdCode,
            serialNumber: generatedIdentity.serialNumber,
            cardObjectKey: preparedCard.cardObjectKey,
            syncIdempotencyKey: syncAttempt.idempotencyKey,
          },
          context: input.context,
        }),
        context: input.context,
      });
    } catch (error) {
      await this.cardService
        .deleteCard(preparedCard.cardObjectKey)
        .catch(() => undefined);
      throw error;
    }

    const syncResult =
      await this.syncService.flushApprovalSyncAttempt(syncAttempt);
    await this.repository.recordSyncAttemptResult({
      idempotencyKey: syncAttempt.idempotencyKey,
      result: syncResult,
      attemptedAt: new Date(),
    });

    await this.eventBus.publish({
      type: "application.approved",
      payload: {
        applicationId: application.id,
        legalName: application.legalName,
        email: application.email,
        freelanceIdCode: generatedIdentity.freelanceIdCode,
        serialNumber: generatedIdentity.serialNumber,
        cardToken: preparedCard.cardToken,
      },
    });

    return { status: "ok" };
  }

  async reject(input: {
    applicationId: string;
    adminId: string;
    rejectionReason: string;
    context: AuditRequestContext;
  }): Promise<AdminReviewResult> {
    const rejectionReason = input.rejectionReason.trim();
    if (!rejectionReason) {
      return {
        status: "invalid",
        message: "A rejection reason is required.",
      };
    }

    const application = await this.repository.findApplicationForReview(
      input.applicationId,
    );
    const pendingCheck = this.requirePendingApplication(application);
    if (pendingCheck) {
      return pendingCheck;
    }
    if (!application) {
      return { status: "not_found" };
    }

    const reapplyCooldownUntil = addDays(
      input.context.timestamp,
      REAPPLY_COOLDOWN_DAYS,
    );

    await this.repository.rejectApplication({
      applicationId: application.id,
      adminId: input.adminId,
      rejectionReason,
      reapplyCooldownUntil,
      auditLog: this.auditService.createEntry({
        applicationId: application.id,
        adminId: input.adminId,
        action: "application.rejected",
        metadata: {
          rejectionReason,
          reapplyCooldownUntil: reapplyCooldownUntil.toISOString(),
        },
        context: input.context,
      }),
      context: input.context,
    });

    await this.eventBus.publish({
      type: "application.rejected",
      payload: {
        applicationId: application.id,
        legalName: application.legalName,
        email: application.email,
        rejectionReason,
        reapplyCooldownUntil,
      },
    });

    return { status: "ok" };
  }

  private requirePendingApplication(
    application: AdminReviewApplicationRecord | null,
  ): AdminReviewResult | null {
    if (!application) {
      return { status: "not_found" };
    }

    if (application.status !== "PENDING") {
      return {
        status: "invalid",
        message: "Only pending applications can be reviewed.",
      };
    }

    return null;
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

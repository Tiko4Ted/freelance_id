import {
  ApplicationStatus,
  DecisionSource,
  type PrismaClient,
} from "@/generated/prisma/client";
import type { AuditRequestContext } from "@/lib/audit/request-context";
import type { AuditLogEntry } from "@/lib/services/audit-service";
import type { GeneratedFreelanceIdentity } from "@/lib/services/id-generation-service";
import type { QueuedSyncAttempt } from "@/lib/services/sync-service";

export type ApprovedCardPersistence = {
  cardObjectKey: string;
  cardTokenHash: string;
  cardTokenExpiresAt: Date;
};

export type AdminReviewApplicationRecord = {
  id: string;
  legalName: string;
  dateOfBirth: Date;
  email: string;
  status: ApplicationStatus;
};

export interface AdminReviewRepository {
  findApplicationForReview(
    applicationId: string,
  ): Promise<AdminReviewApplicationRecord | null>;
  approveApplication(input: {
    applicationId: string;
    adminId: string;
    generatedIdentity: GeneratedFreelanceIdentity;
    preparedCard: ApprovedCardPersistence;
    syncAttempt: QueuedSyncAttempt;
    auditLog: AuditLogEntry;
    context: AuditRequestContext;
  }): Promise<void>;
  rejectApplication(input: {
    applicationId: string;
    adminId: string;
    rejectionReason: string;
    reapplyCooldownUntil: Date;
    auditLog: AuditLogEntry;
    context: AuditRequestContext;
  }): Promise<void>;
  logAudit(input: AuditLogEntry): Promise<void>;
}

export class PrismaAdminReviewRepository implements AdminReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findApplicationForReview(
    applicationId: string,
  ): Promise<AdminReviewApplicationRecord | null> {
    return this.prisma.freelanceIdApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        legalName: true,
        dateOfBirth: true,
        email: true,
        status: true,
      },
    });
  }

  async approveApplication(input: {
    applicationId: string;
    adminId: string;
    generatedIdentity: GeneratedFreelanceIdentity;
    preparedCard: ApprovedCardPersistence;
    syncAttempt: QueuedSyncAttempt;
    auditLog: AuditLogEntry;
    context: AuditRequestContext;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.freelanceIdApplication.updateMany({
        where: {
          id: input.applicationId,
          status: ApplicationStatus.PENDING,
        },
        data: {
          status: ApplicationStatus.APPROVED,
          finalDecisionSource: DecisionSource.ADMIN_REVIEW,
          freelanceIdCode: input.generatedIdentity.freelanceIdCode,
          serialNumber: input.generatedIdentity.serialNumber,
          cardObjectKey: input.preparedCard.cardObjectKey,
          cardTokenHash: input.preparedCard.cardTokenHash,
          cardTokenExpiresAt: input.preparedCard.cardTokenExpiresAt,
          rejectionReason: null,
          reviewedAt: input.context.timestamp,
          reviewedByAdminId: input.adminId,
          reapplyCooldownUntil: null,
        },
      });

      if (updated.count !== 1) {
        throw new Error("Application is no longer pending review.");
      }

      await tx.auditLog.create({
        data: input.auditLog,
      });

      await tx.syncAttempt.create({
        data: {
          applicationId: input.applicationId,
          idempotencyKey: input.syncAttempt.idempotencyKey,
          status: input.syncAttempt.status,
          attemptedAt: input.context.timestamp,
        },
      });
    });
  }

  async rejectApplication(input: {
    applicationId: string;
    adminId: string;
    rejectionReason: string;
    reapplyCooldownUntil: Date;
    auditLog: AuditLogEntry;
    context: AuditRequestContext;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.freelanceIdApplication.updateMany({
        where: {
          id: input.applicationId,
          status: ApplicationStatus.PENDING,
        },
        data: {
          status: ApplicationStatus.REJECTED,
          finalDecisionSource: DecisionSource.ADMIN_REVIEW,
          rejectionReason: input.rejectionReason,
          reviewedAt: input.context.timestamp,
          reviewedByAdminId: input.adminId,
          reapplyCooldownUntil: input.reapplyCooldownUntil,
        },
      });

      if (updated.count !== 1) {
        throw new Error("Application is no longer pending review.");
      }

      await tx.auditLog.create({
        data: input.auditLog,
      });
    });
  }

  async logAudit(input: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: input,
    });
  }
}

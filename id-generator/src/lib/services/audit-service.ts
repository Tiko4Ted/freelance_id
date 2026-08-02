import type { Prisma } from "@/generated/prisma/client";
import type { AuditRequestContext } from "@/lib/audit/request-context";
import type { AdminReviewRepository } from "@/lib/repositories/admin-review-repository";

export type AuditLogEntry = {
  applicationId?: string;
  adminId?: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
};

export class AuditService {
  constructor(private readonly repository: AdminReviewRepository) {}

  createEntry(input: {
    applicationId?: string;
    adminId?: string;
    action: string;
    metadata?: Prisma.InputJsonValue;
    context: AuditRequestContext;
  }): AuditLogEntry {
    return {
      applicationId: input.applicationId,
      adminId: input.adminId,
      action: input.action,
      metadata: input.metadata,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
      timestamp: input.context.timestamp,
    };
  }

  async log(input: {
    applicationId?: string;
    adminId?: string;
    action: string;
    metadata?: Prisma.InputJsonValue;
    context: AuditRequestContext;
  }): Promise<void> {
    await this.repository.logAudit(this.createEntry(input));
  }
}

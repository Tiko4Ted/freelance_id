import { ApplicationStatus, type ScanResult } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const dashboardStatuses = [
  ApplicationStatus.PENDING,
  ApplicationStatus.APPROVED,
  ApplicationStatus.REJECTED,
] as const;

export type DashboardStatus = (typeof dashboardStatuses)[number];

export type DashboardApplicationListItem = {
  id: string;
  legalName: string;
  email: string;
  status: ApplicationStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
};

export type DashboardApplicationDetail = {
  id: string;
  legalName: string;
  dateOfBirth: Date;
  email: string;
  phone: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  reapplyCooldownUntil: Date | null;
  freelanceIdCode: string | null;
  serialNumber: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedByAdmin: { email: string } | null;
  scanAttempts: DashboardScanAttempt[];
  auditLogs: DashboardAuditLog[];
};

export type DashboardScanAttempt = {
  id: string;
  attemptNumber: number;
  timestamp: Date;
  detectionResult: ScanResult;
  confidenceScore: number | null;
  failureReason: string | null;
  thumbnailKey: string | null;
};

export type DashboardAuditLog = {
  id: string;
  action: string;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  adminId: string | null;
};

export function parseDashboardStatus(
  status: string | undefined,
): DashboardStatus | undefined {
  if (dashboardStatuses.some((value) => value === status)) {
    return status as DashboardStatus;
  }

  return undefined;
}

export async function listDashboardApplications(
  status?: DashboardStatus,
): Promise<DashboardApplicationListItem[]> {
  return prisma.freelanceIdApplication.findMany({
    where: status ? { status } : undefined,
    select: {
      id: true,
      legalName: true,
      email: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getDashboardApplicationDetail(
  applicationId: string,
): Promise<DashboardApplicationDetail | null> {
  return prisma.freelanceIdApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      legalName: true,
      dateOfBirth: true,
      email: true,
      phone: true,
      status: true,
      rejectionReason: true,
      reapplyCooldownUntil: true,
      freelanceIdCode: true,
      serialNumber: true,
      submittedAt: true,
      reviewedAt: true,
      reviewedByAdmin: { select: { email: true } },
      scanAttempts: {
        select: {
          id: true,
          attemptNumber: true,
          timestamp: true,
          detectionResult: true,
          confidenceScore: true,
          failureReason: true,
          thumbnailKey: true,
        },
        orderBy: { attemptNumber: "asc" },
      },
      auditLogs: {
        select: {
          id: true,
          action: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          timestamp: true,
          adminId: true,
        },
        orderBy: { timestamp: "desc" },
      },
    },
  });
}

export async function findThumbnailForPreview(input: {
  applicationId: string;
  attemptId: string;
}): Promise<{
  applicationId: string;
  attemptId: string;
  thumbnailKey: string;
} | null> {
  const attempt = await prisma.scanAttempt.findFirst({
    where: {
      id: input.attemptId,
      applicationId: input.applicationId,
      thumbnailKey: { not: null },
    },
    select: {
      id: true,
      applicationId: true,
      thumbnailKey: true,
    },
  });

  if (!attempt?.thumbnailKey) {
    return null;
  }

  return {
    applicationId: attempt.applicationId,
    attemptId: attempt.id,
    thumbnailKey: attempt.thumbnailKey,
  };
}

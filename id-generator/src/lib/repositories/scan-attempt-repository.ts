import type {
  ApplicationStatus,
  DecisionSource,
  PrismaClient,
  ScanResult,
} from "@/generated/prisma/client";

export type ScanAttemptRecord = {
  id: string;
  applicationId: string;
  attemptNumber: number;
  detectionResult: ScanResult;
  confidenceScore: number | null;
  failureReason: string | null;
  thumbnailKey: string | null;
};

export type CreateScanAttemptRecord = {
  applicationId: string;
  attemptNumber: number;
  detectionResult: ScanResult;
  confidenceScore: number | null;
  failureReason: string | null;
  thumbnailKey: string | null;
};

export interface ScanAttemptRepository {
  countForApplication(applicationId: string): Promise<number>;
  countPassingAttempts(applicationId: string): Promise<number>;
  create(input: CreateScanAttemptRecord): Promise<ScanAttemptRecord>;
  updateApplicationDecision(input: {
    applicationId: string;
    status: ApplicationStatus;
    finalDecisionSource: DecisionSource;
  }): Promise<void>;
  setSelfieRetention(input: {
    applicationId: string;
    expiresAt: Date;
  }): Promise<void>;
  findExpiredDemoThumbnails(now: Date): Promise<
    {
      applicationId: string;
      thumbnailKeys: string[];
    }[]
  >;
  clearExpiredDemoThumbnails(applicationId: string): Promise<void>;
}

export class PrismaScanAttemptRepository implements ScanAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countForApplication(applicationId: string): Promise<number> {
    return this.prisma.scanAttempt.count({ where: { applicationId } });
  }

  async countPassingAttempts(applicationId: string): Promise<number> {
    return this.prisma.scanAttempt.count({
      where: { applicationId, detectionResult: "PASS" },
    });
  }

  async create(input: CreateScanAttemptRecord): Promise<ScanAttemptRecord> {
    return this.prisma.scanAttempt.create({
      data: input,
      select: {
        id: true,
        applicationId: true,
        attemptNumber: true,
        detectionResult: true,
        confidenceScore: true,
        failureReason: true,
        thumbnailKey: true,
      },
    });
  }

  async updateApplicationDecision(input: {
    applicationId: string;
    status: ApplicationStatus;
    finalDecisionSource: DecisionSource;
  }): Promise<void> {
    await this.prisma.freelanceIdApplication.update({
      where: { id: input.applicationId },
      data: {
        status: input.status,
        finalDecisionSource: input.finalDecisionSource,
      },
    });
  }

  async setSelfieRetention(input: {
    applicationId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.freelanceIdApplication.update({
      where: { id: input.applicationId },
      data: { selfieRetentionExpiresAt: input.expiresAt },
    });
  }

  async findExpiredDemoThumbnails(now: Date): Promise<
    {
      applicationId: string;
      thumbnailKeys: string[];
    }[]
  > {
    const applications = await this.prisma.freelanceIdApplication.findMany({
      where: {
        selfieRetentionExpiresAt: { lte: now },
        scanAttempts: { some: { thumbnailKey: { not: null } } },
      },
      select: {
        id: true,
        scanAttempts: {
          where: { thumbnailKey: { not: null } },
          select: { thumbnailKey: true },
        },
      },
    });

    return applications.map((application) => ({
      applicationId: application.id,
      thumbnailKeys: application.scanAttempts
        .map((attempt) => attempt.thumbnailKey)
        .filter((key): key is string => Boolean(key)),
    }));
  }

  async clearExpiredDemoThumbnails(applicationId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.scanAttempt.updateMany({
        where: { applicationId },
        data: { thumbnailKey: null },
      }),
      this.prisma.freelanceIdApplication.update({
        where: { id: applicationId },
        data: { selfieRetentionExpiresAt: null },
      }),
    ]);
  }
}

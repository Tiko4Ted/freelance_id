import type {
  ApplicationStatus,
  DecisionSource,
  PrismaClient,
} from "@/generated/prisma/client";

export type ApplicationCooldownRecord = {
  id: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  reapplyCooldownUntil: Date | null;
  adminOverrideCooldown: boolean;
};

export type CreateApplicationRecord = {
  legalName: string;
  normalizedLegalName: string;
  dateOfBirth: Date;
  email: string;
  phone: string;
  consentAt: Date;
  status: ApplicationStatus;
  finalDecisionSource?: DecisionSource;
};

export type CreatedApplicationRecord = {
  id: string;
  legalName: string;
  email: string;
};

export interface ApplicationRepository {
  findByApplicantIdentity(input: {
    normalizedLegalName: string;
    dateOfBirth: Date;
  }): Promise<ApplicationCooldownRecord[]>;
  create(input: CreateApplicationRecord): Promise<CreatedApplicationRecord>;
}

export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByApplicantIdentity(input: {
    normalizedLegalName: string;
    dateOfBirth: Date;
  }): Promise<ApplicationCooldownRecord[]> {
    return this.prisma.freelanceIdApplication.findMany({
      where: {
        normalizedLegalName: input.normalizedLegalName,
        dateOfBirth: input.dateOfBirth,
      },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        reapplyCooldownUntil: true,
        adminOverrideCooldown: true,
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  async create(input: CreateApplicationRecord): Promise<CreatedApplicationRecord> {
    return this.prisma.freelanceIdApplication.create({
      data: input,
      select: {
        id: true,
        legalName: true,
        email: true,
      },
    });
  }
}

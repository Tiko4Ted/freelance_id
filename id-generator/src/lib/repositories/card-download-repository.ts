import type { PrismaClient } from "@/generated/prisma/client";

export type CardDownloadRecord = {
  applicationId: string;
  legalName: string;
  dateOfBirth: Date;
  cardObjectKey: string;
  cardTokenHash: string;
  cardTokenExpiresAt: Date;
};

export interface CardDownloadRepository {
  findByTokenHash(tokenHash: string): Promise<CardDownloadRecord | null>;
}

export class PrismaCardDownloadRepository implements CardDownloadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTokenHash(tokenHash: string): Promise<CardDownloadRecord | null> {
    const application = await this.prisma.freelanceIdApplication.findFirst({
      where: {
        cardTokenHash: tokenHash,
        cardObjectKey: { not: null },
        cardTokenExpiresAt: { not: null },
      },
      select: {
        id: true,
        legalName: true,
        dateOfBirth: true,
        cardObjectKey: true,
        cardTokenHash: true,
        cardTokenExpiresAt: true,
      },
    });

    if (
      !application?.cardObjectKey ||
      !application.cardTokenHash ||
      !application.cardTokenExpiresAt
    ) {
      return null;
    }

    return {
      applicationId: application.id,
      legalName: application.legalName,
      dateOfBirth: application.dateOfBirth,
      cardObjectKey: application.cardObjectKey,
      cardTokenHash: application.cardTokenHash,
      cardTokenExpiresAt: application.cardTokenExpiresAt,
    };
  }
}

import { ApplicationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { DomainEventBus } from "@/lib/events/domain-event-bus";
import type { CardService } from "@/lib/services/card-service";
import type { IdGenerationService } from "@/lib/services/id-generation-service";
import type { SyncService } from "@/lib/services/sync-service";

export class AutoGenerationService {
  constructor(
    private readonly idGenerationService: IdGenerationService,
    private readonly cardService: CardService,
    private readonly eventBus: DomainEventBus,
    private readonly syncService: SyncService,
  ) {}

  async generateAndApproveApplication(applicationId: string): Promise<void> {
    const application = await prisma.freelanceIdApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    // Only process if it is in PROCESSING (payment received) or PENDING (if we want to force it)
    // Actually, we'll allow PROCESSING or PENDING just in case.
    if (
      application.status !== ApplicationStatus.PROCESSING &&
      application.status !== ApplicationStatus.PENDING
    ) {
      console.warn(`Application ${applicationId} is in status ${application.status}. Skipping auto-generation.`);
      return;
    }

    const generatedIdentity =
      await this.idGenerationService.generateForLegalName(
        application.legalName,
      );

    const issueDate = new Date();

    const preparedCard = await this.cardService.prepareApprovedCard({
      applicationId: application.id,
      legalName: application.legalName,
      dateOfBirth: application.dateOfBirth,
      freelanceIdCode: generatedIdentity.freelanceIdCode,
      serialNumber: generatedIdentity.serialNumber,
      issueDate,
    });

    const syncAttempt = this.syncService.createApprovalSyncAttempt({
      applicationId: application.id,
      legalName: application.legalName,
      dateOfBirth: application.dateOfBirth,
      generatedIdentity,
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.freelanceIdApplication.update({
          where: { id: application.id },
          data: {
            status: ApplicationStatus.APPROVED,
            freelanceIdCode: generatedIdentity.freelanceIdCode,
            serialNumber: generatedIdentity.serialNumber,
            cardObjectKey: preparedCard.cardObjectKey,
            cardTokenHash: preparedCard.cardTokenHash,
            cardTokenExpiresAt: preparedCard.cardTokenExpiresAt,
            reviewedAt: issueDate,
          },
        });

        await tx.syncAttempt.create({
          data: {
            applicationId: application.id,
            idempotencyKey: syncAttempt.idempotencyKey,
            status: "PENDING",
          },
        });
      });
    } catch (error) {
      await this.cardService
        .deleteCard(preparedCard.cardObjectKey)
        .catch(() => undefined);
      throw error;
    }

    const syncResult =
      await this.syncService.flushApprovalSyncAttempt(syncAttempt);

    await prisma.syncAttempt.update({
      where: { idempotencyKey: syncAttempt.idempotencyKey },
      data: {
        status: syncResult.status,
        responseCode: syncResult.responseCode,
        attemptedAt: new Date(),
      },
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
  }
}

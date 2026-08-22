import { prisma } from "@/lib/db";
import { InMemoryDomainEventBus } from "@/lib/events/domain-event-bus";
import {
  ConsoleEmailTransport,
  ResendEmailTransport,
  SmtpEmailTransport,
  type EmailTransport,
} from "@/lib/notifications/email-transport";
import { PrismaAdminReviewRepository } from "@/lib/repositories/admin-review-repository";
import { PrismaApplicationRepository } from "@/lib/repositories/application-repository";
import { PrismaCardDownloadRepository } from "@/lib/repositories/card-download-repository";
import { PrismaIdSequenceRepository } from "@/lib/repositories/id-sequence-repository";
import { PrismaScanAttemptRepository } from "@/lib/repositories/scan-attempt-repository";
import { HashSeededRandom } from "@/lib/scan/seeded-rng";
import { AdminReviewService } from "@/lib/services/admin-review-service";
import { ApplicationService } from "@/lib/services/application-service";
import { AuditService } from "@/lib/services/audit-service";
import { CardDownloadService, InMemoryCardRateLimiter } from "@/lib/services/card-download-service";
import { CardService } from "@/lib/services/card-service";
import { IdGenerationService } from "@/lib/services/id-generation-service";
import { NotificationService } from "@/lib/services/notification-service";
import { SelfieRetentionPurgeService } from "@/lib/services/selfie-retention-purge-service";
import { SyncService } from "@/lib/services/sync-service";
import {
  DemoModeDecision,
  ReviewModeDecision,
  type ScanDecisionService,
} from "@/lib/services/scan-decision-service";
import {
  createThumbnailStorageService,
  DisabledThumbnailStorage,
  type ThumbnailStorage,
} from "@/lib/storage/thumbnail-storage";
import { createStorageService } from "@/lib/storage/storage-factory";

const cardRateLimiter = new InMemoryCardRateLimiter();

export function createApplicationService(): ApplicationService {
  const eventBus = createNotificationEventBus();

  return new ApplicationService(
    new PrismaApplicationRepository(prisma),
    eventBus,
  );
}

import { AutoGenerationService } from "@/lib/services/auto-generation-service";

export function createAdminReviewService(): AdminReviewService {
  const repository = new PrismaAdminReviewRepository(prisma);

  return new AdminReviewService(
    repository,
    new IdGenerationService(new PrismaIdSequenceRepository(prisma)),
    new SyncService(),
    createNotificationEventBus(),
    new AuditService(repository),
    createCardService(),
  );
}

export function createAutoGenerationService(): AutoGenerationService {
  return new AutoGenerationService(
    new IdGenerationService(new PrismaIdSequenceRepository(prisma)),
    createCardService(),
    createNotificationEventBus(),
    new SyncService(),
  );
}

export function createAuditService(): AuditService {
  return new AuditService(new PrismaAdminReviewRepository(prisma));
}

export function createCardService(): CardService {
  return new CardService(createStorageService());
}

export function createCardDownloadService(): CardDownloadService {
  return new CardDownloadService(
    new PrismaCardDownloadRepository(prisma),
    createStorageService(),
    createAuditService(),
    cardRateLimiter,
  );
}

export function createScanDecisionService(): ScanDecisionService {
  const repository = new PrismaScanAttemptRepository(prisma);
  const retentionMode = getSelfieRetentionMode();
  const thumbnailStorage = createThumbnailStorage(retentionMode);

  if (process.env.KYC_MODE === "demo") {
    return new DemoModeDecision(
      repository,
      thumbnailStorage,
      retentionMode,
      new HashSeededRandom(process.env.KYC_DEMO_SEED ?? "freelance-id-demo"),
    );
  }

  return new ReviewModeDecision(repository, thumbnailStorage, retentionMode);
}

export function createSelfieRetentionPurgeService(): SelfieRetentionPurgeService {
  const retentionMode = getSelfieRetentionMode();
  return new SelfieRetentionPurgeService(
    new PrismaScanAttemptRepository(prisma),
    createThumbnailStorage(retentionMode),
  );
}

function createEmailTransport(): EmailTransport {
  const fromAddress =
    process.env.EMAIL_FROM ?? "Freelance ID <no-reply@example.com>";

  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return new SmtpEmailTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      fromAddress,
    });
  }

  if (process.env.RESEND_API_KEY) {
    return new ResendEmailTransport(process.env.RESEND_API_KEY, fromAddress);
  }

  return new ConsoleEmailTransport();
}

function createNotificationEventBus(): InMemoryDomainEventBus {
  const eventBus = new InMemoryDomainEventBus();
  const notificationService = new NotificationService(createEmailTransport());
  notificationService.subscribeTo(eventBus);
  return eventBus;
}

function getSelfieRetentionMode(): "ephemeral" | "demo" {
  return process.env.SELFIE_RETENTION_MODE === "demo" ? "demo" : "ephemeral";
}

function createThumbnailStorage(
  retentionMode: "ephemeral" | "demo",
): ThumbnailStorage {
  if (retentionMode === "ephemeral") {
    return new DisabledThumbnailStorage();
  }

  return createThumbnailStorageService();
}

import { prisma } from "@/lib/db";
import { InMemoryDomainEventBus } from "@/lib/events/domain-event-bus";
import {
  ConsoleEmailTransport,
  ResendEmailTransport,
  SmtpEmailTransport,
  type EmailTransport,
} from "@/lib/notifications/email-transport";
import { PrismaApplicationRepository } from "@/lib/repositories/application-repository";
import { PrismaScanAttemptRepository } from "@/lib/repositories/scan-attempt-repository";
import { HashSeededRandom } from "@/lib/scan/seeded-rng";
import { ApplicationService } from "@/lib/services/application-service";
import { NotificationService } from "@/lib/services/notification-service";
import { SelfieRetentionPurgeService } from "@/lib/services/selfie-retention-purge-service";
import {
  DemoModeDecision,
  ReviewModeDecision,
  type ScanDecisionService,
} from "@/lib/services/scan-decision-service";
import {
  DisabledThumbnailStorage,
  S3ThumbnailStorage,
  type ThumbnailStorage,
} from "@/lib/storage/thumbnail-storage";

export function createApplicationService(): ApplicationService {
  const eventBus = new InMemoryDomainEventBus();
  const notificationService = new NotificationService(createEmailTransport());
  notificationService.subscribeTo(eventBus);

  return new ApplicationService(
    new PrismaApplicationRepository(prisma),
    eventBus,
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
    process.env.EMAIL_FROM ?? "Freelance ID Demo <no-reply@example.com>";

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

function getSelfieRetentionMode(): "ephemeral" | "demo" {
  return process.env.SELFIE_RETENTION_MODE === "demo" ? "demo" : "ephemeral";
}

function createThumbnailStorage(
  retentionMode: "ephemeral" | "demo",
): ThumbnailStorage {
  if (retentionMode === "ephemeral") {
    return new DisabledThumbnailStorage();
  }

  const required = {
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  };

  if (!required.bucket || !required.accessKeyId || !required.secretAccessKey) {
    throw new Error(
      "S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required in demo selfie retention mode.",
    );
  }

  return new S3ThumbnailStorage({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "auto",
    bucket: required.bucket,
    accessKeyId: required.accessKeyId,
    secretAccessKey: required.secretAccessKey,
  });
}

import {
  ApplicationStatus,
  DecisionSource,
  ScanResult,
} from "@/generated/prisma/client";
import type { ScanAttemptRepository } from "@/lib/repositories/scan-attempt-repository";
import { interpretScanScore } from "@/lib/scan/scoring";
import type { SeededRandom } from "@/lib/scan/seeded-rng";
import type { ThumbnailStorage } from "@/lib/storage/thumbnail-storage";
import {
  scanFailureMessages,
  type ScanFailureReason,
  type ScanSubmission,
} from "@/lib/validation/scan";

const MAX_SCAN_ATTEMPTS = 5;
const DEMO_FORCED_RETRY_RATE = 0.15;
const THUMBNAIL_RETENTION_MS = 48 * 60 * 60 * 1_000;

export type ScanDecisionOutcome =
  | {
      status: "retry";
      attemptNumber: number;
      detectionResult: ScanResult;
      confidenceScore: number | null;
      message: string;
      remainingAttempts: number;
    }
  | {
      status: "manual_review";
      attemptNumber: number;
      detectionResult: ScanResult;
      confidenceScore: number | null;
      message: string;
    }
  | {
      status: "approved";
      attemptNumber: number;
      detectionResult: typeof ScanResult.PASS;
      confidenceScore: number | null;
      message: string;
    }
  | {
      status: "pending_review";
      attemptNumber: number;
      detectionResult: typeof ScanResult.PASS;
      confidenceScore: number | null;
      message: string;
    };

export interface ScanDecisionService {
  submitScan(input: {
    applicationId: string;
    scan: ScanSubmission;
  }): Promise<ScanDecisionOutcome>;
}

abstract class BaseScanDecision implements ScanDecisionService {
  constructor(
    protected readonly repository: ScanAttemptRepository,
    private readonly thumbnailStorage: ThumbnailStorage,
    private readonly selfieRetentionMode: "ephemeral" | "demo",
  ) {}

  async submitScan(input: {
    applicationId: string;
    scan: ScanSubmission;
  }): Promise<ScanDecisionOutcome> {
    const existingAttempts = await this.repository.countForApplication(
      input.applicationId,
    );
    const attemptNumber = existingAttempts + 1;
    const interpreted = interpretScanScore(input.scan);
    const thumbnailKey = await this.persistThumbnailIfEnabled({
      applicationId: input.applicationId,
      attemptNumber,
      scan: input.scan,
    });

    await this.repository.create({
      applicationId: input.applicationId,
      attemptNumber,
      detectionResult: interpreted.detectionResult,
      confidenceScore: interpreted.confidenceScore,
      failureReason: interpreted.failureReason,
      thumbnailKey,
    });

    if (thumbnailKey) {
      await this.repository.setSelfieRetention({
        applicationId: input.applicationId,
        expiresAt: new Date(Date.now() + THUMBNAIL_RETENTION_MS),
      });
    }

    if (interpreted.detectionResult !== ScanResult.PASS) {
      return this.handleFailure({
        applicationId: input.applicationId,
        attemptNumber,
        detectionResult: interpreted.detectionResult,
        confidenceScore: interpreted.confidenceScore,
        failureReason: interpreted.failureReason,
      });
    }

    return this.handlePass({
      applicationId: input.applicationId,
      attemptNumber,
      confidenceScore: interpreted.confidenceScore,
    });
  }

  protected abstract handlePass(input: {
    applicationId: string;
    attemptNumber: number;
    confidenceScore: number | null;
  }): Promise<ScanDecisionOutcome>;

  private async handleFailure(input: {
    applicationId: string;
    attemptNumber: number;
    detectionResult: ScanResult;
    confidenceScore: number | null;
    failureReason: ScanFailureReason | null;
  }): Promise<ScanDecisionOutcome> {
    if (input.attemptNumber >= MAX_SCAN_ATTEMPTS) {
      await this.repository.updateApplicationDecision({
        applicationId: input.applicationId,
        status: ApplicationStatus.PENDING,
        finalDecisionSource: DecisionSource.ADMIN_REVIEW,
      });

      return {
        status: "manual_review",
        attemptNumber: input.attemptNumber,
        detectionResult: input.detectionResult,
        confidenceScore: input.confidenceScore,
        message:
          "We're having trouble verifying your scan. This has been flagged for manual review.",
      };
    }

    return {
      status: "retry",
      attemptNumber: input.attemptNumber,
      detectionResult: input.detectionResult,
      confidenceScore: input.confidenceScore,
      message:
        scanFailureMessages[input.failureReason ?? "no_face_detected"],
      remainingAttempts: MAX_SCAN_ATTEMPTS - input.attemptNumber,
    };
  }

  private async persistThumbnailIfEnabled(input: {
    applicationId: string;
    attemptNumber: number;
    scan: ScanSubmission;
  }): Promise<string | null> {
    if (this.selfieRetentionMode === "ephemeral") {
      return null;
    }

    if (!input.scan.thumbnailDataUrl) {
      return null;
    }

    const stored = await this.thumbnailStorage.uploadJpegThumbnail({
      applicationId: input.applicationId,
      attemptNumber: input.attemptNumber,
      dataUrl: input.scan.thumbnailDataUrl,
    });

    return stored.key;
  }
}

export class ReviewModeDecision extends BaseScanDecision {
  protected async handlePass(input: {
    applicationId: string;
    attemptNumber: number;
    confidenceScore: number | null;
  }): Promise<ScanDecisionOutcome> {
    await this.repository.updateApplicationDecision({
      applicationId: input.applicationId,
      status: ApplicationStatus.PENDING,
      finalDecisionSource: DecisionSource.ADMIN_REVIEW,
    });

    return {
      status: "pending_review",
      attemptNumber: input.attemptNumber,
      detectionResult: ScanResult.PASS,
      confidenceScore: input.confidenceScore,
      message:
        "Scan complete. Verification in progress, you'll be notified by email within 24-48 hours.",
    };
  }
}

export class DemoModeDecision extends BaseScanDecision {
  constructor(
    repository: ScanAttemptRepository,
    thumbnailStorage: ThumbnailStorage,
    selfieRetentionMode: "ephemeral" | "demo",
    private readonly random: SeededRandom,
  ) {
    super(repository, thumbnailStorage, selfieRetentionMode);
  }

  protected async handlePass(input: {
    applicationId: string;
    attemptNumber: number;
    confidenceScore: number | null;
  }): Promise<ScanDecisionOutcome> {
    const priorPasses = await this.repository.countPassingAttempts(
      input.applicationId,
    );
    const shouldForceRetry =
      priorPasses <= 1 &&
      this.random.next(`${input.applicationId}:${input.attemptNumber}`) <
        DEMO_FORCED_RETRY_RATE;

    if (shouldForceRetry && input.attemptNumber < MAX_SCAN_ATTEMPTS) {
      return {
        status: "retry",
        attemptNumber: input.attemptNumber,
        detectionResult: ScanResult.PASS,
        confidenceScore: input.confidenceScore,
        message: scanFailureMessages.demo_retry,
        remainingAttempts: MAX_SCAN_ATTEMPTS - input.attemptNumber,
      };
    }

    await this.repository.updateApplicationDecision({
      applicationId: input.applicationId,
      status: ApplicationStatus.APPROVED,
      finalDecisionSource: DecisionSource.AUTO,
    });

    return {
      status: "approved",
      attemptNumber: input.attemptNumber,
      detectionResult: ScanResult.PASS,
      confidenceScore: input.confidenceScore,
      message: "Scan passed. Your freelance identity has been approved.",
    };
  }
}

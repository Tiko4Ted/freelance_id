import {
  ApplicationStatus,
  DecisionSource,
  ScanResult,
} from "@/generated/prisma/client";
import type {
  CreateScanAttemptRecord,
  ScanAttemptRecord,
  ScanAttemptRepository,
} from "@/lib/repositories/scan-attempt-repository";
import { HashSeededRandom, type SeededRandom } from "@/lib/scan/seeded-rng";
import {
  DemoModeDecision,
  ReviewModeDecision,
} from "@/lib/services/scan-decision-service";
import { SelfieRetentionPurgeService } from "@/lib/services/selfie-retention-purge-service";
import type { ThumbnailStorage } from "@/lib/storage/thumbnail-storage";
import type { ScanSubmission } from "@/lib/validation/scan";
import { describe, expect, it } from "vitest";

describe("ScanDecisionService", () => {
  it("enforces the retry cap at exactly 5 and forces admin review", async () => {
    const repository = new FakeScanAttemptRepository(4);
    const service = new ReviewModeDecision(
      repository,
      new FakeThumbnailStorage(),
      "ephemeral",
    );

    await expect(
      service.submitScan({
        applicationId: "application-1",
        scan: passingScan({ faceCount: 0 }),
      }),
    ).resolves.toMatchObject({
      status: "manual_review",
      attemptNumber: 5,
      detectionResult: ScanResult.FAIL_NO_FACE,
    });
    expect(repository.decisions).toEqual([
      {
        applicationId: "application-1",
        status: ApplicationStatus.PENDING,
        finalDecisionSource: DecisionSource.ADMIN_REVIEW,
      },
    ]);
  });

  it("keeps passing review-mode scans pending for admin action", async () => {
    const repository = new FakeScanAttemptRepository();
    const service = new ReviewModeDecision(
      repository,
      new FakeThumbnailStorage(),
      "ephemeral",
    );

    await expect(
      service.submitScan({
        applicationId: "application-1",
        scan: passingScan(),
      }),
    ).resolves.toMatchObject({
      status: "pending_review",
      detectionResult: ScanResult.PASS,
    });
    expect(repository.decisions[0]).toMatchObject({
      status: ApplicationStatus.PENDING,
      finalDecisionSource: DecisionSource.ADMIN_REVIEW,
    });
  });

  it("makes demo-mode outcomes deterministic with a seeded random source", async () => {
    const firstRepository = new FakeScanAttemptRepository();
    const secondRepository = new FakeScanAttemptRepository();
    const random = new FixedRandom(0.99);

    const first = new DemoModeDecision(
      firstRepository,
      new FakeThumbnailStorage(),
      "ephemeral",
      random,
    );
    const second = new DemoModeDecision(
      secondRepository,
      new FakeThumbnailStorage(),
      "ephemeral",
      random,
    );

    const firstResult = await first.submitScan({
      applicationId: "application-1",
      scan: passingScan(),
    });
    const secondResult = await second.submitScan({
      applicationId: "application-1",
      scan: passingScan(),
    });

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.status).toBe("approved");
    expect(new HashSeededRandom("seed").next("input")).toBe(
      new HashSeededRandom("seed").next("input"),
    );
  });

  it("forces one demo retry for the seeded low-probability path, then approves the next pass", async () => {
    const repository = new FakeScanAttemptRepository();
    const service = new DemoModeDecision(
      repository,
      new FakeThumbnailStorage(),
      "ephemeral",
      new FixedRandom(0.01),
    );

    await expect(
      service.submitScan({
        applicationId: "application-1",
        scan: passingScan(),
      }),
    ).resolves.toMatchObject({
      status: "retry",
      detectionResult: ScanResult.PASS,
    });

    await expect(
      service.submitScan({
        applicationId: "application-1",
        scan: passingScan(),
      }),
    ).resolves.toMatchObject({
      status: "approved",
      detectionResult: ScanResult.PASS,
    });
  });

  it("does not upload thumbnail bytes in ephemeral mode even if supplied", async () => {
    const storage = new FakeThumbnailStorage();
    const service = new ReviewModeDecision(
      new FakeScanAttemptRepository(),
      storage,
      "ephemeral",
    );

    await service.submitScan({
      applicationId: "application-1",
      scan: passingScan({ thumbnailDataUrl: tinyJpegDataUrl() }),
    });

    expect(storage.uploads).toHaveLength(0);
  });

  it("stores demo thumbnails and sets a 48 hour retention timestamp", async () => {
    const repository = new FakeScanAttemptRepository();
    const storage = new FakeThumbnailStorage();
    const service = new ReviewModeDecision(repository, storage, "demo");

    await service.submitScan({
      applicationId: "application-1",
      scan: passingScan({ thumbnailDataUrl: tinyJpegDataUrl() }),
    });

    expect(storage.uploads).toHaveLength(1);
    expect(repository.attempts[0].thumbnailKey).toBe(
      "thumbs/application-1/1.jpg",
    );
    expect(repository.retentionExpiries[0]?.getTime()).toBeGreaterThan(
      Date.now() + 47 * 60 * 60 * 1_000,
    );
  });
});

describe("SelfieRetentionPurgeService", () => {
  it("deletes expired thumbnails and clears DB references", async () => {
    const repository = new FakeScanAttemptRepository();
    repository.expired = [
      { applicationId: "application-1", thumbnailKeys: ["a.jpg", "b.jpg"] },
    ];
    const storage = new FakeThumbnailStorage();
    const service = new SelfieRetentionPurgeService(repository, storage);

    await expect(service.purgeExpired()).resolves.toEqual({
      applicationsPurged: 1,
      thumbnailsDeleted: 2,
    });
    expect(storage.deletedKeys).toEqual(["a.jpg", "b.jpg"]);
    expect(repository.clearedApplicationIds).toEqual(["application-1"]);
  });
});

class FakeScanAttemptRepository implements ScanAttemptRepository {
  attempts: ScanAttemptRecord[] = [];
  decisions: {
    applicationId: string;
    status: ApplicationStatus;
    finalDecisionSource: DecisionSource;
  }[] = [];
  retentionExpiries: Date[] = [];
  expired: { applicationId: string; thumbnailKeys: string[] }[] = [];
  clearedApplicationIds: string[] = [];

  constructor(private readonly initialAttemptCount = 0) {}

  async countForApplication(): Promise<number> {
    return this.initialAttemptCount + this.attempts.length;
  }

  async countPassingAttempts(): Promise<number> {
    return this.attempts.filter(
      (attempt) => attempt.detectionResult === ScanResult.PASS,
    ).length;
  }

  async create(input: CreateScanAttemptRecord): Promise<ScanAttemptRecord> {
    const attempt = {
      id: `attempt-${input.attemptNumber}`,
      ...input,
    };
    this.attempts.push(attempt);
    return attempt;
  }

  async updateApplicationDecision(input: {
    applicationId: string;
    status: ApplicationStatus;
    finalDecisionSource: DecisionSource;
  }): Promise<void> {
    this.decisions.push(input);
  }

  async setSelfieRetention(input: {
    applicationId: string;
    expiresAt: Date;
  }): Promise<void> {
    this.retentionExpiries.push(input.expiresAt);
  }

  async findExpiredDemoThumbnails(): Promise<
    {
      applicationId: string;
      thumbnailKeys: string[];
    }[]
  > {
    return this.expired;
  }

  async clearExpiredDemoThumbnails(applicationId: string): Promise<void> {
    this.clearedApplicationIds.push(applicationId);
  }
}

class FakeThumbnailStorage implements ThumbnailStorage {
  uploads: string[] = [];
  deletedKeys: string[] = [];

  async uploadJpegThumbnail(input: {
    applicationId: string;
    attemptNumber: number;
    dataUrl: string;
  }) {
    this.uploads.push(input.dataUrl);
    return {
      key: `thumbs/${input.applicationId}/${input.attemptNumber}.jpg`,
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.deletedKeys.push(key);
  }
}

class FixedRandom implements SeededRandom {
  constructor(private readonly value: number) {}

  next(): number {
    return this.value;
  }
}

function passingScan(overrides: Partial<ScanSubmission> = {}): ScanSubmission {
  return {
    faceCount: 1,
    centered: true,
    sizeOk: true,
    blurScore: 80,
    lightingScore: 120,
    confidenceScore: 0.93,
    ...overrides,
  };
}

function tinyJpegDataUrl(): string {
  return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";
}

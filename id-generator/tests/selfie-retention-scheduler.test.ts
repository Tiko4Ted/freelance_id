import type {
  CreateScanAttemptRecord,
  ScanAttemptRecord,
  ScanAttemptRepository,
} from "@/lib/repositories/scan-attempt-repository";
import {
  runScheduledSelfiePurgeJob,
  selfieRetentionPurgeSchedule,
} from "@/lib/jobs/selfie-retention-scheduler";
import { SelfieRetentionPurgeService } from "@/lib/services/selfie-retention-purge-service";
import type { ThumbnailStorage } from "@/lib/storage/thumbnail-storage";
import { describe, expect, it } from "vitest";
import type { ApplicationStatus, DecisionSource } from "@/generated/prisma/client";

describe("selfie retention scheduler", () => {
  it("uses an hourly purge interval", () => {
    expect(selfieRetentionPurgeSchedule).toBe("0 * * * *");
  });

  it("purges seeded expired thumbnails through the scheduled job path", async () => {
    const repository = new InMemoryScanAttemptRepository();
    const storage = new InMemoryThumbnailStorage();
    repository.seedExpiredThumbnail({
      applicationId: "application-1",
      thumbnailKey: "selfie-thumbnails/application-1/1.jpg",
      expiresAt: new Date("2026-08-02T10:00:00Z"),
    });

    const service = new SelfieRetentionPurgeService(repository, storage);
    const result = await runScheduledSelfiePurgeJob(
      service,
      new Date("2026-08-02T11:00:00Z"),
    );

    expect(result).toMatchObject({
      applicationsPurged: 1,
      thumbnailsDeleted: 1,
      ranAt: new Date("2026-08-02T11:00:00Z"),
    });
    expect(storage.deletedKeys).toEqual([
      "selfie-thumbnails/application-1/1.jpg",
    ]);
    expect(repository.application.selfieRetentionExpiresAt).toBeNull();
    expect(repository.attempt.thumbnailKey).toBeNull();
  });
});

class InMemoryScanAttemptRepository implements ScanAttemptRepository {
  application = {
    id: "",
    selfieRetentionExpiresAt: null as Date | null,
  };
  attempt: {
    applicationId: string;
    thumbnailKey: string | null;
  } = {
    applicationId: "",
    thumbnailKey: null,
  };

  seedExpiredThumbnail(input: {
    applicationId: string;
    thumbnailKey: string;
    expiresAt: Date;
  }) {
    this.application = {
      id: input.applicationId,
      selfieRetentionExpiresAt: input.expiresAt,
    };
    this.attempt = {
      applicationId: input.applicationId,
      thumbnailKey: input.thumbnailKey,
    };
  }

  async countForApplication(): Promise<number> {
    return 0;
  }

  async countPassingAttempts(): Promise<number> {
    return 0;
  }

  async create(input: CreateScanAttemptRecord): Promise<ScanAttemptRecord> {
    return {
      id: "attempt-1",
      ...input,
    };
  }

  async updateApplicationDecision(_input: {
    applicationId: string;
    status: ApplicationStatus;
    finalDecisionSource: DecisionSource;
  }): Promise<void> {
    return undefined;
  }

  async setSelfieRetention(input: {
    applicationId: string;
    expiresAt: Date;
  }): Promise<void> {
    this.application = {
      id: input.applicationId,
      selfieRetentionExpiresAt: input.expiresAt,
    };
  }

  async findExpiredDemoThumbnails(now: Date): Promise<
    {
      applicationId: string;
      thumbnailKeys: string[];
    }[]
  > {
    if (
      this.application.selfieRetentionExpiresAt &&
      this.application.selfieRetentionExpiresAt.getTime() <= now.getTime() &&
      this.attempt.thumbnailKey
    ) {
      return [
        {
          applicationId: this.application.id,
          thumbnailKeys: [this.attempt.thumbnailKey],
        },
      ];
    }

    return [];
  }

  async clearExpiredDemoThumbnails(applicationId: string): Promise<void> {
    if (this.application.id !== applicationId) {
      return;
    }

    this.application.selfieRetentionExpiresAt = null;
    this.attempt.thumbnailKey = null;
  }
}

class InMemoryThumbnailStorage implements ThumbnailStorage {
  deletedKeys: string[] = [];

  async uploadJpegThumbnail() {
    return { key: "unused.jpg" };
  }

  async deleteObject(key: string): Promise<void> {
    this.deletedKeys.push(key);
  }
}

import type { ScanAttemptRepository } from "@/lib/repositories/scan-attempt-repository";
import type { ThumbnailStorage } from "@/lib/storage/thumbnail-storage";

export type SelfieRetentionPurgeResult = {
  applicationsPurged: number;
  thumbnailsDeleted: number;
};

export class SelfieRetentionPurgeService {
  constructor(
    private readonly repository: ScanAttemptRepository,
    private readonly thumbnailStorage: ThumbnailStorage,
  ) {}

  /**
   * Deletes expired demo-mode selfie thumbnails and clears their DB references.
   */
  async purgeExpired(now = new Date()): Promise<SelfieRetentionPurgeResult> {
    const expired = await this.repository.findExpiredDemoThumbnails(now);
    let thumbnailsDeleted = 0;

    for (const application of expired) {
      await Promise.all(
        application.thumbnailKeys.map(async (key) => {
          await this.thumbnailStorage.deleteObject(key);
          thumbnailsDeleted += 1;
        }),
      );
      await this.repository.clearExpiredDemoThumbnails(application.applicationId);
    }

    return {
      applicationsPurged: expired.length,
      thumbnailsDeleted,
    };
  }
}

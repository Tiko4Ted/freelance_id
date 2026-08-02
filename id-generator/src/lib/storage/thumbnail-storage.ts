import {
  LocalFilesystemStorageService,
  type StorageService,
} from "@/lib/storage/local-filesystem-storage";
import { createStorageService } from "@/lib/storage/storage-factory";

export type StoredThumbnail = {
  key: string;
};

export interface ThumbnailStorage {
  uploadJpegThumbnail(input: {
    applicationId: string;
    attemptNumber: number;
    dataUrl: string;
  }): Promise<StoredThumbnail>;
  deleteObject(key: string): Promise<void>;
}

export class LocalFilesystemThumbnailStorage implements ThumbnailStorage {
  constructor(private readonly storage: StorageService) {}

  async uploadJpegThumbnail(input: {
    applicationId: string;
    attemptNumber: number;
    dataUrl: string;
  }): Promise<StoredThumbnail> {
    const key = `selfie-thumbnails/${input.applicationId}/${input.attemptNumber}.jpg`;
    await this.storage.put(key, decodeDataUrl(input.dataUrl));

    return { key };
  }

  async deleteObject(key: string): Promise<void> {
    await this.storage.delete(key);
  }
}

export class DisabledThumbnailStorage implements ThumbnailStorage {
  async uploadJpegThumbnail(): Promise<StoredThumbnail> {
    throw new Error("Thumbnail storage is disabled in ephemeral selfie mode.");
  }

  async deleteObject(): Promise<void> {
    return undefined;
  }
}

export function createLocalFilesystemThumbnailStorage(input: {
  rootPath: string;
}): ThumbnailStorage {
  return new LocalFilesystemThumbnailStorage(
    new LocalFilesystemStorageService({
      rootPath: input.rootPath,
    }),
  );
}

export function createThumbnailStorageService(): ThumbnailStorage {
  return new LocalFilesystemThumbnailStorage(createStorageService());
}

function decodeDataUrl(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  return Buffer.from(base64, "base64");
}

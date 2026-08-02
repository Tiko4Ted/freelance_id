import {
  LocalFilesystemStorageService,
  type StorageService,
} from "@/lib/storage/local-filesystem-storage";
import { VercelBlobStorageService } from "@/lib/storage/vercel-blob-storage";

export type StorageDriver = "local" | "vercel-blob";

export function getStorageDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER?.trim() || "local";

  if (driver === "local" || driver === "vercel-blob") {
    return driver;
  }

  throw new Error(
    `Unsupported STORAGE_DRIVER '${driver}'. Expected 'local' or 'vercel-blob'.`,
  );
}

export function createStorageService(): StorageService {
  const driver = getStorageDriver();

  if (driver === "vercel-blob") {
    return new VercelBlobStorageService();
  }

  if (!process.env.STORAGE_ROOT_PATH) {
    throw new Error("STORAGE_ROOT_PATH is required for local private storage.");
  }

  return new LocalFilesystemStorageService({
    rootPath: process.env.STORAGE_ROOT_PATH,
  });
}

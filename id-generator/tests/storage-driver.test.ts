import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalFilesystemStorageService } from "@/lib/storage/local-filesystem-storage";
import { createStorageService, getStorageDriver } from "@/lib/storage/storage-factory";
import { VercelBlobStorageService } from "@/lib/storage/vercel-blob-storage";

describe("storage driver factory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to local filesystem storage", () => {
    vi.stubEnv("STORAGE_DRIVER", "");
    vi.stubEnv("STORAGE_ROOT_PATH", "C:\\temp\\id-generator-storage");

    expect(getStorageDriver()).toBe("local");
    expect(createStorageService()).toBeInstanceOf(LocalFilesystemStorageService);
  });

  it("selects Vercel Blob only when explicitly configured", () => {
    vi.stubEnv("STORAGE_DRIVER", "vercel-blob");

    expect(getStorageDriver()).toBe("vercel-blob");
    expect(createStorageService()).toBeInstanceOf(VercelBlobStorageService);
  });
});

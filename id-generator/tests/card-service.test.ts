import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { CardRenderer } from "@/lib/card/card-renderer";
import { CardService } from "@/lib/services/card-service";
import { LocalFilesystemStorageService } from "@/lib/storage/local-filesystem-storage";

describe("CardService", () => {
  it("renders and stores a private card image with a hashed token", async () => {
    const storageRoot = await mkdtemp(path.join(tmpdir(), "id-card-storage-"));
    const storage = new LocalFilesystemStorageService({ rootPath: storageRoot });
    const service = new CardService(storage);

    try {
      const prepared = await service.prepareApprovedCard({
        applicationId: "application-1",
        legalName: "Mary Ann Smith",
        dateOfBirth: new Date("1990-05-20T00:00:00Z"),
        freelanceIdCode: "FL-MARY-SMITH-000001",
        serialNumber: "SER-SMITH-000001",
        issueDate: new Date("2026-08-02T12:00:00Z"),
      });

      expect(prepared.cardObjectKey).toBe(
        "cards/application-1/FL-MARY-SMITH-000001.png",
      );
      expect(prepared.cardToken).not.toEqual(prepared.cardTokenHash);
      expect(prepared.cardTokenHash).toHaveLength(64);
      expect(prepared.cardTokenExpiresAt).toEqual(
        new Date("2026-08-04T12:00:00Z"),
      );
      await expect(storage.exists(prepared.cardObjectKey)).resolves.toBe(true);
    } finally {
      await rm(storageRoot, { recursive: true, force: true });
    }
  });
});

describe("CardRenderer", () => {
  it("creates a png card image", async () => {
    const bytes = await new CardRenderer().render({
      legalName: "Mary Ann Smith",
      dateOfBirth: new Date("1990-05-20T00:00:00Z"),
      freelanceIdCode: "FL-MARY-SMITH-000001",
      serialNumber: "SER-SMITH-000001",
      issueDate: new Date("2026-08-02T12:00:00Z"),
    });

    const metadata = await sharp(bytes).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1000);
    expect(metadata.height).toBe(620);
  });
});

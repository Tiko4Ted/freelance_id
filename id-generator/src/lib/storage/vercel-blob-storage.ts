import {
  BlobNotFoundError,
  del,
  get,
  head,
  issueSignedToken,
  presignUrl,
  put,
} from "@vercel/blob";
import { Readable } from "node:stream";

import {
  normalizeStorageKey,
  type StoragePutBody,
  type StorageService,
} from "@/lib/storage/local-filesystem-storage";

export class VercelBlobStorageService implements StorageService {
  async put(key: string, body: StoragePutBody): Promise<void> {
    await put(normalizeStorageKey(key), toBlobBody(body), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: contentTypeForKey(key),
    });
  }

  async get(key: string): Promise<Readable> {
    const result = await get(normalizeStorageKey(key), {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new BlobNotFoundError();
    }

    return Readable.fromWeb(
      result.stream as unknown as Parameters<typeof Readable.fromWeb>[0],
    );
  }

  async delete(key: string): Promise<void> {
    await del(normalizeStorageKey(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await head(normalizeStorageKey(key));
      return true;
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return false;
      }

      throw error;
    }
  }

  async createSignedReadUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const pathname = normalizeStorageKey(key);
    const validUntil = Date.now() + expiresInSeconds * 1_000;
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["get"],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: "private",
      operation: "get",
      pathname,
      validUntil,
      useCache: false,
    });

    return presignedUrl;
  }
}

function contentTypeForKey(key: string): string | undefined {
  if (key.endsWith(".png")) {
    return "image/png";
  }

  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return undefined;
}

function toBlobBody(body: StoragePutBody): Buffer | string {
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    return body;
  }

  return Buffer.from(body);
}

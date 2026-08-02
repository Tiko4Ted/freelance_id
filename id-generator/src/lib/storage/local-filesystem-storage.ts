import { createReadStream } from "node:fs";
import { chmod, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";

export type StoragePutBody = Buffer | Uint8Array | string;

export interface StorageService {
  put(key: string, body: StoragePutBody): Promise<void>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createSignedReadUrl?(key: string, expiresInSeconds: number): Promise<string>;
}

export class LocalFilesystemStorageService implements StorageService {
  private readonly rootPath: string;
  private readonly directoryMode: number;
  private readonly fileMode: number;
  private rootReady: Promise<void> | null = null;

  constructor(config: {
    rootPath: string;
    directoryMode?: number;
    fileMode?: number;
  }) {
    if (!path.isAbsolute(config.rootPath)) {
      throw new Error("STORAGE_ROOT_PATH must be an absolute filesystem path.");
    }

    this.rootPath = path.resolve(config.rootPath);
    this.directoryMode = config.directoryMode ?? 0o700;
    this.fileMode = config.fileMode ?? 0o600;
  }

  async put(key: string, body: StoragePutBody): Promise<void> {
    const filePath = this.resolveKey(key);
    await this.ensureParentDirectory(path.dirname(filePath));
    await writeFile(filePath, body, { mode: this.fileMode });
    await chmodIfSupported(filePath, this.fileMode);
  }

  async get(key: string): Promise<Readable> {
    const filePath = this.resolveKey(key);
    await this.ensureRoot();
    return createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    await this.ensureRoot();
    await rm(filePath, { force: true });
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveKey(key);
    await this.ensureRoot();

    try {
      const result = await stat(filePath);
      return result.isFile();
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  private async ensureParentDirectory(directoryPath: string): Promise<void> {
    await this.ensureRoot();

    const relative = path.relative(this.rootPath, directoryPath);
    if (!relative) {
      return;
    }

    let current = this.rootPath;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      await mkdir(current, { recursive: true, mode: this.directoryMode });
      await chmodIfSupported(current, this.directoryMode);
    }
  }

  private async ensureRoot(): Promise<void> {
    this.rootReady ??= mkdir(this.rootPath, {
      recursive: true,
      mode: this.directoryMode,
    }).then(() => chmodIfSupported(this.rootPath, this.directoryMode));

    await this.rootReady;
  }

  private resolveKey(key: string): string {
    const normalizedKey = normalizeStorageKey(key);
    const filePath = path.resolve(this.rootPath, ...normalizedKey.split("/"));
    const relative = path.relative(this.rootPath, filePath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Storage key resolves outside the storage root.");
    }

    return filePath;
  }
}

export function normalizeStorageKey(key: string): string {
  const slashKey = key.replace(/\\/g, "/");
  const normalized = path.posix.normalize(slashKey);

  if (
    !key ||
    slashKey.startsWith("/") ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.win32.isAbsolute(key)
  ) {
    throw new Error("Storage key must be a relative object key.");
  }

  return normalized;
}

async function chmodIfSupported(targetPath: string, mode: number): Promise<void> {
  try {
    await chmod(targetPath, mode);
  } catch (error) {
    if (process.platform !== "win32") {
      throw error;
    }
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

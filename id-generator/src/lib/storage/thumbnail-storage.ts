import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export class S3ThumbnailStorage implements ThumbnailStorage {
  private readonly client: S3Client;

  constructor(
    private readonly config: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    },
  ) {
    this.client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: Boolean(config.endpoint),
    });
  }

  async uploadJpegThumbnail(input: {
    applicationId: string;
    attemptNumber: number;
    dataUrl: string;
  }): Promise<StoredThumbnail> {
    const key = `selfie-thumbnails/${input.applicationId}/${input.attemptNumber}.jpg`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: decodeDataUrl(input.dataUrl),
        ContentType: "image/jpeg",
      }),
    );

    return { key };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
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

function decodeDataUrl(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  return Buffer.from(base64, "base64");
}

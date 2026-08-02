import type { Readable } from "node:stream";

import type { AuditRequestContext } from "@/lib/audit/request-context";
import type {
  CardDownloadRecord,
  CardDownloadRepository,
} from "@/lib/repositories/card-download-repository";
import { hashOpaqueToken } from "@/lib/security/token";
import type { AuditService } from "@/lib/services/audit-service";
import type { StorageService } from "@/lib/storage/local-filesystem-storage";

const TOKEN_FAILURE_LIMIT = 5;
const IP_FAILURE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1_000;
const LOCKOUT_MS = 30 * 60 * 1_000;

export type CardTokenState =
  | { status: "valid"; application: CardDownloadRecord }
  | { status: "expired" }
  | { status: "not_found" };

export type CardDownloadResult =
  | { status: "ok"; stream: Readable; filename: string }
  | { status: "ok_url"; url: string }
  | { status: "invalid_dob"; remainingAttempts: number }
  | { status: "locked"; retryAfterSeconds: number }
  | { status: "expired" }
  | { status: "not_found" };

export interface CardRateLimiter {
  check(input: {
    tokenHash: string;
    ipAddress: string | null;
    now: Date;
  }): { locked: boolean; retryAfterSeconds: number };
  recordFailure(input: {
    tokenHash: string;
    ipAddress: string | null;
    now: Date;
  }): { locked: boolean; retryAfterSeconds: number; tokenFailures: number };
}

export class InMemoryCardRateLimiter implements CardRateLimiter {
  private readonly tokenBuckets = new Map<string, FailureBucket>();
  private readonly ipBuckets = new Map<string, FailureBucket>();

  check(input: {
    tokenHash: string;
    ipAddress: string | null;
    now: Date;
  }): { locked: boolean; retryAfterSeconds: number } {
    const token = getBucket(this.tokenBuckets, input.tokenHash, input.now);
    const ip = input.ipAddress
      ? getBucket(this.ipBuckets, input.ipAddress, input.now)
      : null;

    return lockState([token, ip], input.now);
  }

  recordFailure(input: {
    tokenHash: string;
    ipAddress: string | null;
    now: Date;
  }): { locked: boolean; retryAfterSeconds: number; tokenFailures: number } {
    const token = getBucket(this.tokenBuckets, input.tokenHash, input.now);
    token.count += 1;
    if (token.count > TOKEN_FAILURE_LIMIT) {
      token.lockedUntil = new Date(input.now.getTime() + LOCKOUT_MS);
    }

    const buckets: (FailureBucket | null)[] = [token];
    if (input.ipAddress) {
      const ip = getBucket(this.ipBuckets, input.ipAddress, input.now);
      ip.count += 1;
      if (ip.count > IP_FAILURE_LIMIT) {
        ip.lockedUntil = new Date(input.now.getTime() + LOCKOUT_MS);
      }
      buckets.push(ip);
    }

    const state = lockState(buckets, input.now);
    return {
      ...state,
      tokenFailures: token.count,
    };
  }
}

export class CardDownloadService {
  constructor(
    private readonly repository: CardDownloadRepository,
    private readonly storage: StorageService,
    private readonly auditService: AuditService,
    private readonly rateLimiter: CardRateLimiter,
  ) {}

  async getTokenState(input: {
    token: string;
    now?: Date;
  }): Promise<CardTokenState> {
    const tokenHash = hashOpaqueToken(input.token);
    const application = await this.repository.findByTokenHash(tokenHash);

    if (!application) {
      return { status: "not_found" };
    }

    if (application.cardTokenExpiresAt.getTime() <= (input.now ?? new Date()).getTime()) {
      return { status: "expired" };
    }

    return { status: "valid", application };
  }

  async download(input: {
    token: string;
    dateOfBirth: string;
    context: AuditRequestContext;
  }): Promise<CardDownloadResult> {
    const tokenHash = hashOpaqueToken(input.token);
    const application = await this.repository.findByTokenHash(tokenHash);

    if (!application) {
      return { status: "not_found" };
    }

    if (application.cardTokenExpiresAt.getTime() <= input.context.timestamp.getTime()) {
      return { status: "expired" };
    }

    const preCheck = this.rateLimiter.check({
      tokenHash,
      ipAddress: input.context.ipAddress,
      now: input.context.timestamp,
    });
    if (preCheck.locked) {
      return { status: "locked", retryAfterSeconds: preCheck.retryAfterSeconds };
    }

    if (!dobMatches(application.dateOfBirth, input.dateOfBirth)) {
      const failure = this.rateLimiter.recordFailure({
        tokenHash,
        ipAddress: input.context.ipAddress,
        now: input.context.timestamp,
      });

      await this.auditService.log({
        applicationId: application.applicationId,
        action: "card.dob_failed",
        metadata: {
          tokenHash,
          failureCountForToken: failure.tokenFailures,
        },
        context: input.context,
      });

      if (failure.locked) {
        return { status: "locked", retryAfterSeconds: failure.retryAfterSeconds };
      }

      return {
        status: "invalid_dob",
        remainingAttempts: Math.max(0, TOKEN_FAILURE_LIMIT - failure.tokenFailures),
      };
    }

    if (!(await this.storage.exists(application.cardObjectKey))) {
      return { status: "not_found" };
    }

    if (this.storage.createSignedReadUrl) {
      return {
        status: "ok_url",
        url: await this.storage.createSignedReadUrl(application.cardObjectKey, 300),
      };
    }

    return {
      status: "ok",
      stream: await this.storage.get(application.cardObjectKey),
      filename: `${application.legalName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "freelance-id-card"}.png`,
    };
  }
}

type FailureBucket = {
  windowStartedAt: Date;
  count: number;
  lockedUntil: Date | null;
};

function getBucket(
  buckets: Map<string, FailureBucket>,
  key: string,
  now: Date,
): FailureBucket {
  const existing = buckets.get(key);
  if (
    existing &&
    now.getTime() - existing.windowStartedAt.getTime() < WINDOW_MS
  ) {
    return existing;
  }

  const bucket = { windowStartedAt: now, count: 0, lockedUntil: null };
  buckets.set(key, bucket);
  return bucket;
}

function lockState(
  buckets: (FailureBucket | null)[],
  now: Date,
): { locked: boolean; retryAfterSeconds: number } {
  const lockedUntil = buckets
    .map((bucket) => bucket?.lockedUntil)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (!lockedUntil || lockedUntil.getTime() <= now.getTime()) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  return {
    locked: true,
    retryAfterSeconds: Math.ceil(
      (lockedUntil.getTime() - now.getTime()) / 1_000,
    ),
  };
}

function dobMatches(expected: Date, submitted: string): boolean {
  return formatDate(expected) === submitted;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

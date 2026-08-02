import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuditLogEntry } from "@/lib/services/audit-service";
import type { CardDownloadRepository } from "@/lib/repositories/card-download-repository";
import { hashOpaqueToken } from "@/lib/security/token";
import {
  CardDownloadService,
  InMemoryCardRateLimiter,
} from "@/lib/services/card-download-service";
import type { AuditService } from "@/lib/services/audit-service";
import type { StorageService, StoragePutBody } from "@/lib/storage/local-filesystem-storage";

const testState = vi.hoisted(() => ({
  service: null as CardDownloadService | null,
  audit: null as FakeAuditService | null,
}));

vi.mock("@/lib/application-container", () => ({
  createCardDownloadService: () => {
    if (!testState.service) {
      throw new Error("Test card download service was not configured.");
    }
    return testState.service;
  },
}));

describe("/api/card/[token]", () => {
  beforeEach(() => {
    testState.audit = new FakeAuditService();
    testState.service = new CardDownloadService(
      new FakeCardDownloadRepository(),
      new FakeStorageService(),
      testState.audit as unknown as AuditService,
      new InMemoryCardRateLimiter(),
    );
  });

  it("rate limits on the 6th failed DOB attempt for a token in an hour", async () => {
    const { POST } = await import("@/app/api/card/[token]/route");
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await POST(wrongDobRequest(), {
        params: { token: "test-token" },
      });
      statuses.push(response.status);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    expect(testState.audit?.logs).toHaveLength(6);
    expect(testState.audit?.logs[0]).toMatchObject({
      applicationId: "application-1",
      action: "card.dob_failed",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
      metadata: {
        tokenHash: hashOpaqueToken("test-token"),
        failureCountForToken: 1,
      },
    });
  });

  it("streams the card on a matching DOB", async () => {
    const { POST } = await import("@/app/api/card/[token]/route");

    const response = await POST(correctDobRequest(), {
      params: { token: "test-token" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    await expect(response.arrayBuffer()).resolves.toHaveProperty("byteLength", 7);
  });

  it("returns an explicit expired-link state", async () => {
    testState.audit = new FakeAuditService();
    testState.service = new CardDownloadService(
      new FakeCardDownloadRepository(new Date("2000-01-01T12:00:00Z")),
      new FakeStorageService(),
      testState.audit as unknown as AuditService,
      new InMemoryCardRateLimiter(),
    );
    const { POST } = await import("@/app/api/card/[token]/route");

    const response = await POST(correctDobRequest(), {
      params: { token: "test-token" },
    });

    expect(response.status).toBe(410);
    await expect(response.text()).resolves.toContain("link expired");
  });
});

function wrongDobRequest(): Request {
  return dobRequest("1991-05-20");
}

function correctDobRequest(): Request {
  return dobRequest("1990-05-20");
}

function dobRequest(dateOfBirth: string): Request {
  const body = new URLSearchParams({ dateOfBirth });
  return new Request("http://localhost/api/card/test-token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "vitest",
      "x-forwarded-for": "203.0.113.10",
    },
    body,
  });
}

class FakeCardDownloadRepository implements CardDownloadRepository {
  constructor(
    private readonly expiresAt = new Date("2099-08-04T12:00:00Z"),
  ) {}

  async findByTokenHash(tokenHash: string) {
    if (tokenHash !== hashOpaqueToken("test-token")) {
      return null;
    }

    return {
      applicationId: "application-1",
      legalName: "Mary Ann Smith",
      dateOfBirth: new Date("1990-05-20T00:00:00Z"),
      cardObjectKey: "cards/application-1/card.png",
      cardTokenHash: tokenHash,
      cardTokenExpiresAt: this.expiresAt,
    };
  }
}

class FakeStorageService implements StorageService {
  async put(_key: string, _body: StoragePutBody): Promise<void> {
    return undefined;
  }

  async get(): Promise<Readable> {
    return Readable.from(Buffer.from("pngdata"));
  }

  async delete(): Promise<void> {
    return undefined;
  }

  async exists(): Promise<boolean> {
    return true;
  }
}

class FakeAuditService {
  logs: AuditLogEntry[] = [];

  async log(input: {
    applicationId?: string;
    action: string;
    metadata?: AuditLogEntry["metadata"];
    context: {
      ipAddress: string | null;
      userAgent: string | null;
      timestamp: Date;
    };
  }): Promise<void> {
    this.logs.push({
      applicationId: input.applicationId,
      action: input.action,
      metadata: input.metadata,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
      timestamp: input.context.timestamp,
    });
  }
}

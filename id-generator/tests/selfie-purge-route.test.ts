import { afterEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  purgeCount: 0,
}));

vi.mock("@/lib/application-container", () => ({
  createSelfieRetentionPurgeService: () => ({
    purgeExpired: async () => {
      testState.purgeCount += 1;
      return {
        applicationsPurged: 1,
        thumbnailsDeleted: 2,
      };
    },
  }),
}));

describe("/api/internal/selfie-purge", () => {
  afterEach(() => {
    testState.purgeCount = 0;
    vi.unstubAllEnvs();
  });

  it("rejects requests without the shared secret", async () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", "secret-for-tests");
    const { POST } = await import("@/app/api/internal/selfie-purge/route");

    const response = await POST(
      new Request("http://localhost/api/internal/selfie-purge", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(testState.purgeCount).toBe(0);
  });

  it("runs the purge job when the shared secret is provided", async () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", "secret-for-tests");
    const { POST } = await import("@/app/api/internal/selfie-purge/route");

    const response = await POST(
      new Request("http://localhost/api/internal/selfie-purge", {
        method: "POST",
        headers: { authorization: "Bearer secret-for-tests" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      applicationsPurged: 1,
      thumbnailsDeleted: 2,
    });
    expect(testState.purgeCount).toBe(1);
  });
});

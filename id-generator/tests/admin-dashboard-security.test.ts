import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";

import { authorizeAdminSession } from "@/lib/auth/admin-session-state";

describe("admin dashboard session gates", () => {
  it("blocks a valid admin session until the MFA step is complete", () => {
    const session = {
      expires: new Date("2026-08-02T12:00:00Z").toISOString(),
      user: {
        id: "admin-1",
        email: "admin@example.com",
        mfaVerified: false,
      },
    } satisfies Session;

    expect(authorizeAdminSession(session)).toEqual({
      status: "mfa_required",
      adminId: "admin-1",
    });
  });

  it("authorizes only sessions with MFA completion", () => {
    const session = {
      expires: new Date("2026-08-02T12:00:00Z").toISOString(),
      user: {
        id: "admin-1",
        email: "admin@example.com",
        mfaVerified: true,
      },
    } satisfies Session;

    expect(authorizeAdminSession(session)).toEqual({
      status: "authorized",
      adminId: "admin-1",
      email: "admin@example.com",
    });
  });
});

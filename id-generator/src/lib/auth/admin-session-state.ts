import type { Session } from "next-auth";

export type AdminSessionState =
  | { status: "unauthenticated" }
  | { status: "mfa_required"; adminId: string }
  | { status: "authorized"; adminId: string; email: string };

export function authorizeAdminSession(session: Session | null): AdminSessionState {
  const adminId = session?.user?.id;

  if (!adminId) {
    return { status: "unauthenticated" };
  }

  if (!session.user.mfaVerified) {
    return { status: "mfa_required", adminId };
  }

  return {
    status: "authorized",
    adminId,
    email: session.user.email ?? "",
  };
}

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  authorizeAdminSession,
  type AdminSessionState,
} from "@/lib/auth/admin-session-state";

export { authorizeAdminSession, type AdminSessionState };

export async function requireAdminMfaSession(): Promise<{
  adminId: string;
  email: string;
}> {
  const state = authorizeAdminSession(await auth());

  if (state.status === "unauthenticated") {
    redirect("/dashboard/login");
  }

  if (state.status === "mfa_required") {
    redirect("/dashboard/mfa");
  }

  return {
    adminId: state.adminId,
    email: state.email,
  };
}

export async function getAdminMfaRouteState(): Promise<AdminSessionState> {
  return authorizeAdminSession(await auth());
}

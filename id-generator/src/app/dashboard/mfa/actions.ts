"use server";

import { verify } from "otplib";
import { redirect } from "next/navigation";

import { unstable_update } from "@/auth";
import { getAdminMfaRouteState } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db";

export type MfaActionState = {
  message: string | null;
};

export async function verifyMfaAction(
  _state: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const sessionState = await getAdminMfaRouteState();

  if (sessionState.status === "unauthenticated") {
    redirect("/dashboard/login");
  }

  if (sessionState.status === "authorized") {
    redirect("/dashboard");
  }

  const code = String(formData.get("totp") ?? "").replace(/\s+/g, "");
  if (!code) {
    return { message: "Enter the current MFA code." };
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: sessionState.adminId },
    select: { totpSecret: true, mfaEnabled: true },
  });

  if (!admin?.mfaEnabled) {
    return { message: "MFA is required for admin access." };
  }

  const result = await verify({
    secret: admin.totpSecret,
    token: code,
  });

  if (!result.valid) {
    return { message: "Invalid MFA code." };
  }

  await unstable_update({
    user: {
      mfaVerified: true,
    },
  });

  redirect("/dashboard");
}

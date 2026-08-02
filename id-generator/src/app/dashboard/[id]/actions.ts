"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminReviewService } from "@/lib/application-container";
import { getServerActionAuditContext } from "@/lib/audit/request-context";
import { requireAdminMfaSession } from "@/lib/auth/admin-session";

export type RejectActionState = {
  message: string | null;
};

export async function approveApplicationAction(
  applicationId: string,
): Promise<void> {
  const session = await requireAdminMfaSession();
  const result = await createAdminReviewService().approve({
    applicationId,
    adminId: session.adminId,
    context: getServerActionAuditContext(),
  });

  if (result.status !== "ok") {
    throw new Error(result.status === "not_found" ? "Not found" : result.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${applicationId}`);
  redirect(`/dashboard/${applicationId}`);
}

export async function rejectApplicationAction(
  applicationId: string,
  _state: RejectActionState,
  formData: FormData,
): Promise<RejectActionState> {
  const session = await requireAdminMfaSession();
  const result = await createAdminReviewService().reject({
    applicationId,
    adminId: session.adminId,
    rejectionReason: String(formData.get("rejectionReason") ?? ""),
    context: getServerActionAuditContext(),
  });

  if (result.status !== "ok") {
    return {
      message:
        result.status === "not_found" ? "Application was not found." : result.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${applicationId}`);
  redirect(`/dashboard/${applicationId}`);
}

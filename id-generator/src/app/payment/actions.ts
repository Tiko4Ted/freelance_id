"use server";

import { ApplicationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function processPaymentAction(applicationId: string) {
  try {
    const app = await prisma.freelanceIdApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) {
      return { success: false, error: "Application not found." };
    }

    if (app.status !== ApplicationStatus.PENDING) {
       // If it's already processing or approved, we shouldn't charge again.
       return { success: true };
    }

    await prisma.freelanceIdApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.PROCESSING },
    });

    return { success: true };
  } catch (error) {
    console.error("Payment processing error:", error);
    return { success: false, error: "Failed to process payment." };
  }
}

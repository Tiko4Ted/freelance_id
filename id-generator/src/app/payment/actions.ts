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

export async function initiateMpesaPaymentAction(applicationId: string, phoneNumber: string) {
  const db = prisma;
  
  try {
    const app = await db.freelanceIdApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) {
      return { success: false, error: "Application not found." };
    }

    if (app.status !== ApplicationStatus.PENDING) {
      return { success: false, error: "Application is not awaiting payment." };
    }

    // Amount should be the equivalent of $20 in KES if doing currency conversion, 
    // but we use 1 for testing or whatever amount is configured for this paybill.
    // Assuming 20 for now.
    const { triggerStkPush } = await import("@/lib/mpesa");
    const response = await triggerStkPush(
      phoneNumber,
      20,
      app.id, // AccountReference
      "Freelance ID Payment"
    );

    if (response.ResponseCode === "0") {
       await db.mpesaTransaction.create({
         data: {
           applicationId: app.id,
           checkoutRequestId: response.CheckoutRequestID,
           merchantRequestId: response.MerchantRequestID,
           phoneNumber: phoneNumber,
           amount: 20
         }
       });

       return { success: true };
    } else {
       return { success: false, error: response.CustomerMessage || "Failed to initiate M-Pesa push." };
    }

  } catch (error: any) {
    console.error("M-Pesa init error:", error);
    return { success: false, error: error.message || "Failed to connect to M-Pesa. Please verify your environment variables." };
  }
}

export async function initiatePaypalPaymentAction(applicationId: string) {
  const db = prisma;
  
  try {
    const app = await db.freelanceIdApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) {
      return { success: false, error: "Application not found." };
    }

    if (app.status !== ApplicationStatus.PENDING) {
      return { success: false, error: "Application is not awaiting payment." };
    }

    const { createPaypalOrder } = await import("@/lib/paypal");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    // Create the order via PayPal REST API
    const returnUrl = `${appUrl}/payment/capture?applicationId=${applicationId}`;
    const cancelUrl = `${appUrl}/payment?applicationId=${applicationId}`;
    
    const { orderId, approveLink } = await createPaypalOrder(20, returnUrl, cancelUrl);

    if (orderId) {
       await db.paypalTransaction.create({
         data: {
           applicationId: app.id,
           orderId: orderId,
           amount: 20
         }
       });

       return { success: true, approveLink };
    } else {
       return { success: false, error: "Failed to initiate PayPal order." };
    }

  } catch (error: any) {
    console.error("PayPal init error:", error);
    return { success: false, error: error.message || "Failed to connect to PayPal. Please verify your environment variables." };
  }
}

export async function capturePaypalPaymentAction(orderId: string, applicationId: string) {
  const db = prisma;
  
  try {
    const paypalTx = await db.paypalTransaction.findUnique({
      where: { orderId },
    });

    if (!paypalTx) {
      return { success: false, error: "Transaction not found." };
    }

    if (paypalTx.applicationId !== applicationId) {
      return { success: false, error: "Transaction mismatch." };
    }

    const { capturePaypalOrder } = await import("@/lib/paypal");
    const captureResult = await capturePaypalOrder(orderId);

    if (captureResult.status === "COMPLETED") {
       await db.$transaction(async (tx) => {
         await tx.paypalTransaction.update({
           where: { id: paypalTx.id },
           data: { status: "COMPLETED" }
         });

         await tx.freelanceIdApplication.update({
           where: { id: applicationId },
           data: { status: ApplicationStatus.PROCESSING },
         });
       });

       return { success: true };
    } else {
       await db.paypalTransaction.update({
         where: { id: paypalTx.id },
         data: { status: "FAILED" }
       });
       return { success: false, error: "Payment was not completed." };
    }

  } catch (error: any) {
    console.error("PayPal capture error:", error);
    return { success: false, error: error.message || "Failed to capture payment." };
  }
}

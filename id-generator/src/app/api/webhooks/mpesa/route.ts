import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApplicationStatus } from "@/generated/prisma/client";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const callbackData = payload?.Body?.stkCallback;
    if (!callbackData) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { CheckoutRequestID, ResultCode } = callbackData;

    if (!CheckoutRequestID) {
      return NextResponse.json({ error: "Missing CheckoutRequestID" }, { status: 400 });
    }

    const mpesaTx = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (!mpesaTx) {
      console.error(`MpesaTransaction not found for CheckoutRequestID: ${CheckoutRequestID}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (ResultCode === 0) {
      // Payment successful
      await prisma.$transaction(async (tx) => {
        await tx.mpesaTransaction.update({
          where: { id: mpesaTx.id },
          data: { status: "SUCCESS" },
        });

        await tx.freelanceIdApplication.update({
          where: { id: mpesaTx.applicationId },
          data: { status: ApplicationStatus.PROCESSING },
        });
      });
    } else {
      // Payment failed, cancelled, or timed out
      await prisma.mpesaTransaction.update({
        where: { id: mpesaTx.id },
        data: { status: "FAILED" },
      });
    }

    // Acknowledge receipt to Safaricom so they don't retry
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  } catch (error) {
    console.error("M-Pesa Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

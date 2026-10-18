import { NextResponse } from "next/server";

import { ApplicationStatus } from "@/generated/prisma/client";
import { createScanDecisionService } from "@/lib/application-container";
import { prisma } from "@/lib/db";
import { scanSubmissionSchema } from "@/lib/validation/scan";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const application = await prisma.freelanceIdApplication.findUnique({
    where: { id: params.id },
    select: { status: true, documentVerifiedAt: true },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 },
    );
  }

  if (!application.documentVerifiedAt) {
    return NextResponse.json(
      { error: "Complete document verification before facial verification." },
      { status: 409 },
    );
  }

  if (application.status !== ApplicationStatus.PENDING) {
    return NextResponse.json(
      { error: "This application is no longer accepting facial scans." },
      { status: 409 },
    );
  }

  const json = await request.json();
  const parsed = scanSubmissionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid scan payload.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const decision = await createScanDecisionService().submitScan({
    applicationId: params.id,
    scan: parsed.data,
  });

  return NextResponse.json(decision);
}

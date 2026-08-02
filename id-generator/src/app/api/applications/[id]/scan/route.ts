import { NextResponse } from "next/server";

import { createScanDecisionService } from "@/lib/application-container";
import { scanSubmissionSchema } from "@/lib/validation/scan";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
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

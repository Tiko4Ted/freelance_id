import { NextResponse } from "next/server";

import { createSelfieRetentionPurgeService } from "@/lib/application-container";
import { runScheduledSelfiePurgeJob } from "@/lib/jobs/selfie-retention-scheduler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorized(request.headers)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runScheduledSelfiePurgeJob(
    createSelfieRetentionPurgeService(),
  );

  return NextResponse.json({
    applicationsPurged: result.applicationsPurged,
    thumbnailsDeleted: result.thumbnailsDeleted,
    ranAt: result.ranAt.toISOString(),
  });
}

export async function GET(request: Request) {
  return POST(request);
}

function isAuthorized(headers: Headers): boolean {
  const secret = process.env.INTERNAL_CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization = headers.get("authorization");
  const headerSecret = headers.get("x-cron-secret");

  return authorization === `Bearer ${secret}` || headerSecret === secret;
}

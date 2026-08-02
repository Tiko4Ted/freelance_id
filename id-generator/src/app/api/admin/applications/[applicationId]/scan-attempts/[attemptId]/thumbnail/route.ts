import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createAuditService } from "@/lib/application-container";
import { requestContextFromHeaders } from "@/lib/audit/request-context";
import { findThumbnailForPreview } from "@/lib/admin/dashboard-queries";
import { authorizeAdminSession } from "@/lib/auth/admin-session-state";
import { createStorageService } from "@/lib/storage/storage-factory";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: { applicationId: string; attemptId: string };
  },
) {
  const sessionState = authorizeAdminSession(await auth());

  if (sessionState.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (sessionState.status === "mfa_required") {
    return NextResponse.json({ error: "MFA required." }, { status: 403 });
  }

  if (process.env.SELFIE_RETENTION_MODE !== "demo") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const thumbnail = await findThumbnailForPreview({
    applicationId: params.applicationId,
    attemptId: params.attemptId,
  });

  if (!thumbnail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const storage = createStorageService();

  if (!(await storage.exists(thumbnail.thumbnailKey))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const context = requestContextFromHeaders(request.headers);
  await createAuditService().log({
    applicationId: thumbnail.applicationId,
    adminId: sessionState.adminId,
    action: "thumbnail.viewed",
    metadata: {
      attemptId: thumbnail.attemptId,
      thumbnailKey: thumbnail.thumbnailKey,
    },
    context,
  });

  if (storage.createSignedReadUrl) {
    return NextResponse.redirect(
      await storage.createSignedReadUrl(thumbnail.thumbnailKey, 300),
      303,
    );
  }

  const stream = await storage.get(thumbnail.thumbnailKey);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/jpeg",
    },
  });
}

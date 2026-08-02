import { Readable } from "node:stream";

import { createCardDownloadService } from "@/lib/application-container";
import { requestContextFromHeaders } from "@/lib/audit/request-context";

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  const formData = await request.formData();
  const result = await createCardDownloadService().download({
    token: params.token,
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    context: requestContextFromHeaders(request.headers),
  });

  if (result.status === "expired") {
    return new Response("This card download link expired.", { status: 410 });
  }

  if (result.status === "locked") {
    return new Response("Too many failed DOB attempts. Try again later.", {
      status: 429,
      headers: {
        "Retry-After": result.retryAfterSeconds.toString(),
      },
    });
  }

  if (result.status === "invalid_dob") {
    return new Response(
      `Date of birth did not match. Remaining attempts: ${result.remainingAttempts}.`,
      { status: 401 },
    );
  }

  if (result.status === "not_found") {
    return new Response("This card download link is invalid.", { status: 404 });
  }

  if (result.status === "ok_url") {
    return Response.redirect(result.url, 303);
  }

  return new Response(Readable.toWeb(result.stream) as ReadableStream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${escapeHeader(result.filename)}"`,
      "Content-Type": "image/png",
    },
  });
}

export async function GET() {
  return new Response("Enter DOB on the card download page.", { status: 405 });
}

function escapeHeader(value: string): string {
  return value.replace(/["\\\r\n]/g, "");
}

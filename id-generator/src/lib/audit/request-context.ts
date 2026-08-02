import { headers } from "next/headers";

export type AuditRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
};

export function requestContextFromHeaders(
  headerList: Headers,
  now = new Date(),
): AuditRequestContext {
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    null;

  return {
    ipAddress,
    userAgent: headerList.get("user-agent"),
    timestamp: now,
  };
}

export function getServerActionAuditContext(
  now = new Date(),
): AuditRequestContext {
  return requestContextFromHeaders(headers(), now);
}

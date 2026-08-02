import type { ScanSubmission } from "@/lib/validation/scan";

export type BrowserScanMetrics = Omit<ScanSubmission, "thumbnailDataUrl">;

export function createScanSubmissionPayload(input: {
  metrics: BrowserScanMetrics;
  retentionMode: "ephemeral" | "demo";
  thumbnailDataUrl: string | null;
}): ScanSubmission {
  if (input.retentionMode === "demo" && input.thumbnailDataUrl) {
    return {
      ...input.metrics,
      thumbnailDataUrl: input.thumbnailDataUrl,
    };
  }

  return input.metrics;
}

import { createScanSubmissionPayload } from "@/lib/scan/client-payload";
import { describe, expect, it } from "vitest";

describe("createScanSubmissionPayload", () => {
  it("omits image bytes in ephemeral selfie mode", () => {
    expect(
      createScanSubmissionPayload({
        metrics: metrics(),
        retentionMode: "ephemeral",
        thumbnailDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
      }),
    ).not.toHaveProperty("thumbnailDataUrl");
  });

  it("includes only the low-res thumbnail in demo retention mode", () => {
    expect(
      createScanSubmissionPayload({
        metrics: metrics(),
        retentionMode: "demo",
        thumbnailDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
      }),
    ).toMatchObject({
      thumbnailDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
    });
  });
});

function metrics() {
  return {
    faceCount: 1,
    centered: true,
    sizeOk: true,
    blurScore: 80,
    lightingScore: 120,
    confidenceScore: 0.93,
  };
}

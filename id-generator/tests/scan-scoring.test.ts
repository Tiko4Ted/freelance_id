import { ScanResult } from "@/generated/prisma/client";
import { interpretScanScore } from "@/lib/scan/scoring";
import { describe, expect, it } from "vitest";

describe("interpretScanScore", () => {
  it.each([
    [{ faceCount: 0 }, ScanResult.FAIL_NO_FACE, "no_face_detected"],
    [{ faceCount: 2 }, ScanResult.FAIL_MULTIPLE_FACES, "multiple_faces"],
    [{ centered: false }, ScanResult.FAIL_OFF_CENTER, "off_center"],
    [{ lightingScore: 20 }, ScanResult.FAIL_LOW_LIGHT, "low_light"],
    [{ blurScore: 10 }, ScanResult.FAIL_BLURRY, "blurry"],
  ])("maps scan quality problems to %s", (overrides, result, reason) => {
    expect(interpretScanScore(scan(overrides))).toMatchObject({
      detectionResult: result,
      failureReason: reason,
    });
  });

  it("passes a normal centered face and preserves face-api confidence", () => {
    expect(interpretScanScore(scan({ confidenceScore: 0.94 }))).toEqual({
      detectionResult: ScanResult.PASS,
      failureReason: null,
      confidenceScore: 0.94,
    });
  });
});

function scan(
  overrides: Partial<Parameters<typeof interpretScanScore>[0]>,
): Parameters<typeof interpretScanScore>[0] {
  return {
    faceCount: 1,
    centered: true,
    sizeOk: true,
    blurScore: 80,
    lightingScore: 120,
    confidenceScore: 0.9,
    ...overrides,
  };
}

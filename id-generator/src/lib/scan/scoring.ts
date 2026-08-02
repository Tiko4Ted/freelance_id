import { ScanResult } from "@/generated/prisma/client";
import type {
  ScanFailureReason,
  ScanSubmission,
} from "@/lib/validation/scan";

const MIN_BLUR_SCORE = 45;
const MIN_LIGHTING_SCORE = 55;

export type InterpretedScanScore = {
  detectionResult: ScanResult;
  failureReason: ScanFailureReason | null;
  confidenceScore: number | null;
};

export function interpretScanScore(
  submission: ScanSubmission,
): InterpretedScanScore {
  if (submission.faceCount === 0) {
    return failure(ScanResult.FAIL_NO_FACE, "no_face_detected", submission);
  }

  if (submission.faceCount > 1) {
    return failure(ScanResult.FAIL_MULTIPLE_FACES, "multiple_faces", submission);
  }

  if (!submission.centered || !submission.sizeOk) {
    return failure(ScanResult.FAIL_OFF_CENTER, "off_center", submission);
  }

  if (submission.lightingScore < MIN_LIGHTING_SCORE) {
    return failure(ScanResult.FAIL_LOW_LIGHT, "low_light", submission);
  }

  if (submission.blurScore < MIN_BLUR_SCORE) {
    return failure(ScanResult.FAIL_BLURRY, "blurry", submission);
  }

  return {
    detectionResult: ScanResult.PASS,
    failureReason: null,
    confidenceScore: submission.confidenceScore,
  };
}

function failure(
  detectionResult: ScanResult,
  failureReason: ScanFailureReason,
  submission: ScanSubmission,
): InterpretedScanScore {
  return {
    detectionResult,
    failureReason,
    confidenceScore: submission.confidenceScore,
  };
}

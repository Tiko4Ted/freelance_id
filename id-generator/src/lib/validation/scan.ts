import { z } from "zod";

export const scanSubmissionSchema = z.object({
  faceCount: z.number().int().min(0).max(10),
  centered: z.boolean(),
  sizeOk: z.boolean(),
  blurScore: z.number().min(0),
  lightingScore: z.number().min(0).max(255),
  confidenceScore: z.number().min(0).max(1).nullable(),
  thumbnailDataUrl: z
    .string()
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});

export type ScanSubmission = z.infer<typeof scanSubmissionSchema>;

export type ScanFailureReason =
  | "no_face_detected"
  | "off_center"
  | "low_light"
  | "blurry"
  | "multiple_faces"
  | "demo_retry";

export const scanFailureMessages: Record<ScanFailureReason, string> = {
  no_face_detected:
    "We couldn't detect a face. Make sure you're facing the camera.",
  off_center: "Please center your face within the guide.",
  low_light: "Lighting is too low. Try a brighter location.",
  blurry: "Image is unclear. Hold still and try again.",
  multiple_faces: "Only one face should be visible in the frame.",
  demo_retry: "Scan quality confirmed. Please complete one more scan to continue.",
};

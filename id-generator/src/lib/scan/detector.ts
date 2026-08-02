import type { BrowserScanMetrics } from "@/lib/scan/client-payload";

type FaceApi = typeof import("face-api.js");

let faceApiPromise: Promise<FaceApi> | null = null;
let modelsPromise: Promise<FaceApi> | null = null;

export async function loadFaceApiModels(): Promise<FaceApi> {
  if (!faceApiPromise) {
    faceApiPromise = import("face-api.js");
  }

  const faceapi = await faceApiPromise;
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
    ]).then(() => faceapi);
  }

  return modelsPromise;
}

export async function detectVideoFrame(
  video: HTMLVideoElement,
): Promise<BrowserScanMetrics> {
  const faceapi = await loadFaceApiModels();
  const detections = await faceapi
    .detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
      }),
    )
    .withFaceLandmarks(true);

  const quality = estimateFrameQuality(video);
  const primary = detections[0]?.detection;

  if (!primary) {
    return {
      faceCount: detections.length,
      centered: false,
      sizeOk: false,
      blurScore: quality.blurScore,
      lightingScore: quality.lightingScore,
      confidenceScore: null,
    };
  }

  const guide = getGuideBounds(video.videoWidth, video.videoHeight);
  const box = primary.box;
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const centered =
    faceCenterX >= guide.x &&
    faceCenterX <= guide.x + guide.width &&
    faceCenterY >= guide.y &&
    faceCenterY <= guide.y + guide.height;
  const sizeOk =
    box.width >= guide.width * 0.45 &&
    box.width <= guide.width * 1.15 &&
    box.height >= guide.height * 0.35 &&
    box.height <= guide.height * 1.2;

  return {
    faceCount: detections.length,
    centered,
    sizeOk,
    blurScore: quality.blurScore,
    lightingScore: quality.lightingScore,
    confidenceScore: primary.score,
  };
}

export function captureThumbnailDataUrl(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  const maxWidth = 240;
  const scale = maxWidth / video.videoWidth;
  canvas.width = maxWidth;
  canvas.height = Math.round(video.videoHeight * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to capture thumbnail frame.");
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6);
}

function getGuideBounds(videoWidth: number, videoHeight: number) {
  const width = videoWidth * 0.46;
  const height = videoHeight * 0.62;

  return {
    x: (videoWidth - width) / 2,
    y: (videoHeight - height) / 2,
    width,
    height,
  };
}

function estimateFrameQuality(video: HTMLVideoElement): {
  blurScore: number;
  lightingScore: number;
} {
  const canvas = document.createElement("canvas");
  const width = 96;
  const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { blurScore: 0, lightingScore: 0 };
  }

  context.drawImage(video, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance = new Float32Array(width * height);
  let totalLuminance = 0;

  for (let index = 0; index < width * height; index += 1) {
    const pixelIndex = index * 4;
    const value =
      pixels[pixelIndex] * 0.299 +
      pixels[pixelIndex + 1] * 0.587 +
      pixels[pixelIndex + 2] * 0.114;
    luminance[index] = value;
    totalLuminance += value;
  }

  return {
    blurScore: laplacianVariance(luminance, width, height),
    lightingScore: totalLuminance / luminance.length,
  };
}

function laplacianVariance(
  luminance: Float32Array,
  width: number,
  height: number,
): number {
  const values: number[] = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = luminance[y * width + x] * 4;
      const neighbors =
        luminance[(y - 1) * width + x] +
        luminance[(y + 1) * width + x] +
        luminance[y * width + x - 1] +
        luminance[y * width + x + 1];
      values.push(Math.abs(center - neighbors));
    }
  }

  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  return Math.min(variance, 999);
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScanProgress } from "@/components/ScanProgress";
import {
  createScanSubmissionPayload,
  type BrowserScanMetrics,
} from "@/lib/scan/client-payload";
import {
  captureThumbnailDataUrl,
  detectVideoFrame,
  loadFaceApiModels,
} from "@/lib/scan/detector";
import type { ScanDecisionOutcome } from "@/lib/services/scan-decision-service";

type CameraState = "preparing" | "ready" | "blocked" | "error";

const stableCaptureMs = 1_000;
const minimumRevealMs = 2_000;

export function ScanCamera({ applicationId }: { applicationId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const lastMetricsRef = useRef<BrowserScanMetrics | null>(null);
  const submittingRef = useRef(false);
  const [cameraState, setCameraState] = useState<CameraState>("preparing");
  const [statusText, setStatusText] = useState("Preparing scan");
  const [metrics, setMetrics] = useState<BrowserScanMetrics | null>(null);
  const [decision, setDecision] = useState<ScanDecisionOutcome | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const retentionMode = getRetentionMode();

  const readyForCapture = useMemo(() => {
    return Boolean(
      metrics &&
        metrics.faceCount === 1 &&
        metrics.centered &&
        metrics.sizeOk &&
        metrics.blurScore >= 45 &&
        metrics.lightingScore >= 55,
    );
  }, [metrics]);

  const submitCurrentFrame = useCallback(async () => {
    const video = videoRef.current;
    const currentMetrics = lastMetricsRef.current;
    if (!video || !currentMetrics || submittingRef.current || scanLocked) {
      return;
    }

    submittingRef.current = true;
    setShowProgress(true);
    setDecision(null);

    try {
      const startedAt = Date.now();
      const thumbnailDataUrl =
        retentionMode === "demo" ? captureThumbnailDataUrl(video) : null;
      const payload = createScanSubmissionPayload({
        metrics: currentMetrics,
        retentionMode,
        thumbnailDataUrl,
      });
      const responsePromise = fetch(`/api/applications/${applicationId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error("Scan submission failed.");
        }

        return (await response.json()) as ScanDecisionOutcome;
      });

      const [result] = await Promise.all([
        responsePromise,
        delay(Math.max(0, minimumRevealMs - (Date.now() - startedAt))),
      ]);

      setDecision(result);
      setScanLocked(result.status !== "retry");
    } catch {
      setStatusText("Scan submission failed. Try again.");
    } finally {
      setShowProgress(false);
      submittingRef.current = false;
      stableSinceRef.current = null;
    }
  }, [applicationId, retentionMode, scanLocked]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        setStatusText("Preparing scan");
        await loadFaceApiModels();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState("ready");
        setStatusText("Center your face in the guide");
      } catch (error) {
        setCameraState("blocked");
        setStatusText(
          error instanceof Error
            ? error.message
            : "Camera permission is required to continue.",
        );
      }
    }

    prepare();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (cameraState !== "ready") {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (
        !video ||
        scanLocked ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        return;
      }

      try {
        const nextMetrics = await detectVideoFrame(video);
        lastMetricsRef.current = nextMetrics;
        setMetrics(nextMetrics);
        setStatusText(statusFromMetrics(nextMetrics));

        const stable =
          nextMetrics.faceCount === 1 &&
          nextMetrics.centered &&
          nextMetrics.sizeOk &&
          nextMetrics.blurScore >= 45 &&
          nextMetrics.lightingScore >= 55;

        if (!stable) {
          stableSinceRef.current = null;
          return;
        }

        stableSinceRef.current ??= Date.now();
        if (Date.now() - stableSinceRef.current >= stableCaptureMs) {
          await submitCurrentFrame();
        }
      } catch {
        setCameraState("error");
        setStatusText("Face detection could not read the camera frame.");
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, [cameraState, scanLocked, submitCurrentFrame]);

  return (
    <div className="grid gap-5">
      <div className="relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
        <video
          aria-label="Live camera preview"
          className="aspect-[3/4] w-full bg-black object-cover sm:aspect-video"
          muted
          playsInline
          ref={videoRef}
        />
        <FaceGuide ready={readyForCapture} />
        {showProgress ? <ScanProgress /> : null}
        
        {/* Success Overlay */}
        {decision && decision.status !== "retry" ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.4)] border border-emerald-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-16 w-16">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <p aria-live="polite" className="text-sm font-medium text-neutral-100">
          {statusText}
        </p>
        <MetricsPanel metrics={metrics} />
        <DecisionPanel decision={decision} />
        <button
          className="h-11 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
          disabled={
            cameraState !== "ready" || showProgress || !metrics || scanLocked
          }
          onClick={() => void submitCurrentFrame()}
          type="button"
        >
          Scan now
        </button>
      </div>
    </div>
  );
}

function FaceGuide({ ready }: { ready: boolean }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <ellipse
        cx="50"
        cy="48"
        fill="none"
        rx="23"
        ry="31"
        stroke={ready ? "#67e8f9" : "#fbbf24"}
        strokeDasharray="2 3"
        strokeWidth="1.2"
      />
      <path
        d="M50 13v8M50 75v8M19 48h8M73 48h8"
        stroke={ready ? "#67e8f9" : "#fbbf24"}
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function MetricsPanel({ metrics }: { metrics: BrowserScanMetrics | null }) {
  const rows = [
    ["Face", metrics ? faceLabel(metrics.faceCount) : "Waiting"],
    ["Position", metrics?.centered ? "Centered" : "Adjust"],
    ["Distance", metrics?.sizeOk ? "Good" : "Adjust"],
    ["Lighting", metrics ? Math.round(metrics.lightingScore).toString() : "-"],
    ["Clarity", metrics ? Math.round(metrics.blurScore).toString() : "-"],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {rows.map(([label, value]) => (
        <div className="rounded-md bg-neutral-950 p-3" key={label}>
          <p className="text-xs text-neutral-400">{label}</p>
          <p className="text-sm font-medium text-neutral-100">{value}</p>
        </div>
      ))}
    </div>
  );
}

function DecisionPanel({ decision }: { decision: ScanDecisionOutcome | null }) {
  if (!decision) {
    return null;
  }

  const tone =
    decision.status === "retry"
      ? "border-amber-400/40 bg-amber-950/30 text-amber-100"
      : decision.status === "manual_review"
        ? "border-cyan-300/40 bg-cyan-950/30 text-cyan-100"
        : "border-emerald-400/40 bg-emerald-950/30 text-emerald-100";

  return (
    <div className={`rounded-md border p-3 text-sm ${tone}`} role="status">
      {decision.message}
    </div>
  );
}

function statusFromMetrics(metrics: BrowserScanMetrics): string {
  if (metrics.faceCount === 0) {
    return "Face not detected";
  }

  if (metrics.faceCount > 1) {
    return "Only one face should be in frame";
  }

  if (!metrics.centered || !metrics.sizeOk) {
    return "Align your face inside the guide";
  }

  if (metrics.lightingScore < 55) {
    return "Move to brighter light";
  }

  if (metrics.blurScore < 45) {
    return "Hold still for a clearer frame";
  }

  return "Hold steady";
}

function faceLabel(faceCount: number): string {
  if (faceCount === 0) {
    return "None";
  }

  if (faceCount === 1) {
    return "Detected";
  }

  return "Multiple";
}

function getRetentionMode(): "ephemeral" | "demo" {
  return process.env.NEXT_PUBLIC_SELFIE_RETENTION_MODE === "demo"
    ? "demo"
    : "ephemeral";
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

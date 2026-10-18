"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  documentTypes,
  getDocumentType,
  type DocumentScanSide,
} from "@/lib/identity/document-verification";

type CameraState = "preparing" | "ready" | "blocked";
type CaptureState = "idle" | "capturing";

export function DocumentScanCamera({
  documentType,
  onCaptureComplete,
}: {
  documentType: string;
  onCaptureComplete: (captured: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("preparing");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [scanSideIndex, setScanSideIndex] = useState(0);
  const [capturedSides, setCapturedSides] = useState<DocumentScanSide[]>([]);
  const [statusText, setStatusText] = useState("Preparing camera");
  const selectedDocument = useMemo(
    () => getDocumentType(documentType) ?? documentTypes[0],
    [documentType],
  );
  const scanSides = selectedDocument.scanSides;
  const currentSide = scanSides[scanSideIndex] ?? scanSides[0];
  const currentSideCaptured = capturedSides.includes(currentSide);
  const hasMultipleSides = scanSides.length > 1;
  const allSidesCaptured = capturedSides.length === scanSides.length;

  useEffect(() => {
    let cancelled = false;

    async function prepareCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
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
        setStatusText("Camera ready");
      } catch {
        setCameraState("blocked");
        setStatusText("Camera unavailable");
      }
    }

    if (navigator.mediaDevices) {
      void prepareCamera();
    } else {
      setCameraState("blocked");
      setStatusText("Camera unavailable");
    }

    return () => {
      cancelled = true;
      if (captureTimerRef.current) {
        window.clearTimeout(captureTimerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    setScanSideIndex(0);
    setCapturedSides([]);
    setCaptureState("idle");
    onCaptureComplete(false);
  }, [documentType, onCaptureComplete]);

  function simulateCapture() {
    if (
      captureState !== "idle" ||
      cameraState === "preparing" ||
      currentSideCaptured
    ) {
      return;
    }

    setCaptureState("capturing");
    setStatusText("Scanning");
    captureTimerRef.current = window.setTimeout(() => {
      const nextCapturedSides = [...capturedSides, currentSide];
      const complete = nextCapturedSides.length === scanSides.length;

      setCapturedSides(nextCapturedSides);
      setCaptureState("idle");
      setStatusText(complete ? "Scan complete" : "Scan saved");
      onCaptureComplete(complete);
    }, 1_200);
  }

  function toggleSide() {
    if (!hasMultipleSides || captureState === "capturing") {
      return;
    }

    if (!capturedSides.includes("front")) {
      return;
    }

    setScanSideIndex((currentIndex) => (currentIndex === 0 ? 1 : 0));
    setStatusText("Camera ready");
  }

  const sideLabel = currentSide === "back" ? "Back" : "Front";
  const toggleLabel = currentSide === "front" ? "Back" : "Front";

  return (
    <div className="grid gap-3">
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-neutral-800 bg-black">
        <video
          aria-label="Document camera preview"
          className="aspect-[4/3] w-full object-cover"
          muted
          playsInline
          ref={videoRef}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(0,0,0,0.62)_76%)]" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div
            className={`relative w-full max-w-[27rem] rounded-lg border-2 border-dashed transition-colors ${currentSideCaptured ? "border-emerald-300" : "border-cyan-300"}`}
            style={{ aspectRatio: selectedDocument.aspectRatio }}
          >
            <div className="absolute -inset-1 rounded-lg border border-white/20" />
            <span className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-cyan-200" />
            <span className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-cyan-200" />
            <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-cyan-200" />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-cyan-200" />
            {captureState === "capturing" ? (
              <div className="absolute inset-x-2 top-1/2 h-px animate-pulse bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
            ) : null}
          </div>
        </div>
        <span className="sr-only" aria-live="polite">
          {statusText}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          className="h-10 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
          disabled={
            cameraState !== "ready" ||
            captureState === "capturing" ||
            currentSideCaptured
          }
          onClick={simulateCapture}
          type="button"
        >
          {captureState === "capturing"
            ? "Scanning..."
            : currentSideCaptured
              ? `${sideLabel} saved`
              : `Scan ${sideLabel.toLowerCase()}`}
        </button>

        {hasMultipleSides ? (
          <button
            aria-label={`Open ${toggleLabel.toLowerCase()} side`}
            className="h-10 rounded-md border border-neutral-600 px-4 text-sm font-semibold text-neutral-200 transition hover:border-cyan-300/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              cameraState !== "ready" ||
              captureState === "capturing" ||
              !capturedSides.includes("front")
            }
            onClick={toggleSide}
            type="button"
          >
            {toggleLabel}
          </button>
        ) : null}
      </div>

      <span className="sr-only">
        {allSidesCaptured ? "All document scans saved" : `Current side: ${sideLabel}`}
      </span>
    </div>
  );
}

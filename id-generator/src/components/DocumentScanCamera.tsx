"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  documentTypes,
  getDocumentType,
} from "@/lib/identity/document-verification";

type CameraState = "preparing" | "ready" | "blocked";
type CaptureState = "idle" | "capturing" | "captured";

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
  const [statusText, setStatusText] = useState("Preparing document camera");
  const selectedDocument = useMemo(
    () => getDocumentType(documentType) ?? documentTypes[0],
    [documentType],
  );

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
        setStatusText("Place the front of your document inside the frame");
      } catch {
        setCameraState("blocked");
        setStatusText("Camera unavailable. Continue with the demo alignment.");
      }
    }

    if (navigator.mediaDevices) {
      void prepareCamera();
    } else {
      setCameraState("blocked");
      setStatusText("Camera unavailable. Continue with the demo alignment.");
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
    setCaptureState("idle");
    onCaptureComplete(false);
    setStatusText(
      cameraState === "ready"
        ? "Place the front of your document inside the frame"
        : "Select a document type to prepare the frame",
    );
  }, [cameraState, documentType, onCaptureComplete]);

  function simulateCapture() {
    if (captureState !== "idle" || cameraState === "preparing") {
      return;
    }

    setCaptureState("capturing");
    setStatusText("Holding the frame steady and checking alignment");
    captureTimerRef.current = window.setTimeout(() => {
      setCaptureState("captured");
      setStatusText("Document frame accepted. No document contents were read.");
      onCaptureComplete(true);
    }, 1_200);
  }

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-black">
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
            className={`relative w-full max-w-[27rem] rounded-lg border-2 border-dashed transition-colors ${captureState === "captured" ? "border-emerald-300" : "border-cyan-300"}`}
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
            <div className="absolute inset-x-0 bottom-3 text-center text-[10px] font-semibold tracking-[0.18em] text-white/70">
              {selectedDocument.frameLabel.toUpperCase()} FRAME
            </div>
          </div>
        </div>
        <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
          Camera preview
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
        <span aria-live="polite">{statusText}</span>
        <span className="shrink-0 text-neutral-500">
          {selectedDocument.frameLabel}
        </span>
      </div>

      <button
        className="h-11 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={cameraState === "preparing" || captureState !== "idle"}
        onClick={simulateCapture}
        type="button"
      >
        {captureState === "capturing"
          ? "Checking document..."
          : captureState === "captured"
            ? "Document aligned"
            : "Align document"}
      </button>
    </div>
  );
}

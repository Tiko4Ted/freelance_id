"use client";

import { useEffect, useState } from "react";

const statusMessages = [
  "Analyzing facial features...",
  "Checking image quality...",
  "Verifying scan...",
];

export function ScanProgress() {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setProgress((value) => Math.min(value + 4, 100));
    }, 80);
    const messageTimer = window.setInterval(() => {
      setMessageIndex((value) => (value + 1) % statusMessages.length);
    }, 650);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(messageTimer);
    };
  }, []);

  const dashOffset = 283 - (283 * progress) / 100;

  return (
    <div
      aria-live="polite"
      className="absolute inset-0 z-20 grid place-items-center bg-neutral-950/80 backdrop-blur-sm"
    >
      <div className="grid justify-items-center gap-4">
        <svg aria-hidden className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            className="stroke-neutral-700"
            cx="50"
            cy="50"
            fill="none"
            r="45"
            strokeWidth="7"
          />
          <circle
            className="stroke-cyan-300 transition-[stroke-dashoffset] duration-100"
            cx="50"
            cy="50"
            fill="none"
            r="45"
            strokeDasharray="283"
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="7"
          />
        </svg>
        <p className="text-sm font-medium text-neutral-100">
          {statusMessages[messageIndex]}
        </p>
      </div>
    </div>
  );
}

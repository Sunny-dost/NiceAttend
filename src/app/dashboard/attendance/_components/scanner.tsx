"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScanResult, ScanResultCard } from "./scan-result-card";
import { ScanHistory } from "./scan-history";

interface ScannerProps {
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
}

// Audio synthesizer helpers via Web Audio API
function playChime(frequencies: number[], duration = 0.25, type: OscillatorType = "sine") {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.12);
      osc.stop(ctx.currentTime + index * 0.12 + duration);
    });
  } catch {
    // AudioContext blocked or not supported
  }
}

function playSuccessChime() {
  playChime([880, 1100], 0.28, "sine");
}

function playDuplicateChime() {
  playChime([520, 520], 0.15, "triangle");
}

function playErrorTone() {
  playChime([260, 200], 0.35, "sawtooth");
}

function triggerHaptic(pattern: number | number[]) {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration not supported
  }
}

export function Scanner({ currentUser }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);

  const html5QrCodeRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const lastScannedMapRef = useRef<Map<string, number>>(new Map());
  const DEBOUNCE_MS = 2500;

  // Stop camera helper
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      }
      setIsScanning(false);
      setTorchActive(false);
    }
  };

  // Process decoded QR token
  const handleDecodedToken = async (decodedText: string) => {
    const token = decodedText.trim();
    if (!token) return;

    // 1. Client-side 2.5s debounce check
    const now = Date.now();
    const lastScanTime = lastScannedMapRef.current.get(token);
    if (lastScanTime && now - lastScanTime < DEBOUNCE_MS) {
      return;
    }

    // 2. Prevent overlapping network requests
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    lastScannedMapRef.current.set(token, now);

    try {
      const response = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 200) {
        const isLate = data.status === "LATE";
        const result: ScanResult = {
          type: isLate ? "late" : "success",
          message: isLate ? "Late arrival recorded" : "Attendance recorded",
          student: data.student,
          status: data.status,
          timeFormatted: data.formattedTime,
          recordedBy: data.recordedBy,
          timestamp: new Date(),
        };

        playSuccessChime();
        triggerHaptic(isLate ? [80, 50, 80] : 100);
        setLastResult(result);
        setHistory((prev) => [result, ...prev.slice(0, 19)]);
      } else if (response.status === 409) {
        // Already marked today
        const result: ScanResult = {
          type: "duplicate",
          message: data.message || "Already marked today",
          student: data.student,
          existing: data.existing,
          timestamp: new Date(),
        };

        playDuplicateChime();
        triggerHaptic([60, 60, 60]);
        setLastResult(result);
        setHistory((prev) => [result, ...prev.slice(0, 19)]);
      } else if (response.status === 422) {
        // Inactive student
        const result: ScanResult = {
          type: "inactive",
          message: data.message || "Student inactive or withdrawn",
          student: data.student,
          timestamp: new Date(),
        };

        playErrorTone();
        triggerHaptic([200, 100, 200]);
        setLastResult(result);
        setHistory((prev) => [result, ...prev.slice(0, 19)]);
      } else if (response.status === 404) {
        // Unknown QR code
        const result: ScanResult = {
          type: "unknown",
          message: "Unrecognized QR code symbol. Make sure it was issued by Nice School System.",
          timestamp: new Date(),
        };

        playErrorTone();
        triggerHaptic([200, 100, 200]);
        setLastResult(result);
        setHistory((prev) => [result, ...prev.slice(0, 19)]);
      } else {
        const result: ScanResult = {
          type: "error",
          message: data.message || "Server error while processing scan.",
          timestamp: new Date(),
        };

        playErrorTone();
        triggerHaptic([250]);
        setLastResult(result);
      }
    } catch (err) {
      console.error("Scan fetch error:", err);
      const result: ScanResult = {
        type: "error",
        message: "Network error. Check internet connection.",
        timestamp: new Date(),
      };
      playErrorTone();
      setLastResult(result);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  };

  // Start camera handler
  const startCamera = async () => {
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }

      const qrCode = html5QrCodeRef.current;

      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          handleDecodedToken(decodedText);
        },
        () => {
          // Frame-by-frame silent scan miss
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const capabilities = qrCode.getRunningTrackCapabilities?.();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: any) {
      console.error("Failed to start camera:", err);
      setIsScanning(false);
      if (err?.name === "NotAllowedError" || String(err).includes("NotAllowedError")) {
        setCameraError("Camera permission denied. Please enable camera access in your browser settings and refresh.");
      } else if (err?.name === "NotFoundError" || String(err).includes("NotFoundError")) {
        setCameraError("No camera device found on this system.");
      } else {
        setCameraError("Could not access camera. Ensure you are accessing via HTTPS or localhost.");
      }
    }
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const nextState = !torchActive;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchActive(nextState);
    } catch (err) {
      console.warn("Torch toggle failed:", err);
    }
  };

  // Auto-start camera when mounting component
  useEffect(() => {
    startCamera();

    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📷</span> Mobile QR Scanner
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operator: <span className="font-semibold text-blue-900">{currentUser.fullName}</span> ({currentUser.role})
          </p>
        </div>
        <Link
          href="/dashboard/students"
          className="text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
        >
          Manual Roster
        </Link>
      </div>

      {/* Camera Viewport Container */}
      <div className="bg-slate-900 rounded-3xl p-3 shadow-md border border-slate-800 text-white relative">
        <div className="relative w-full aspect-square max-h-[360px] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
          {/* Target Reticle Overlay */}
          <div
            id="qr-reader"
            className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
          />

          {!isScanning && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 z-10">
              <span className="text-4xl mb-3">📸</span>
              <p className="text-sm font-semibold text-white mb-3">
                Camera is currently stopped
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition"
              >
                Launch Scanner
              </button>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-10">
              <span className="text-3xl mb-2 text-rose-500">⚠️</span>
              <p className="text-xs font-semibold text-rose-300 mb-4 max-w-xs leading-relaxed">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Viewfinder Controls Bar */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80 px-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isScanning ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-300">
              {isScanning ? "Scanner Active" : "Standby"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {torchSupported && isScanning && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  torchActive
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <span>🔦</span>
                <span>{torchActive ? "Light ON" : "Torch"}</span>
              </button>
            )}

            {isScanning ? (
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Latest Scan Result Card */}
      {lastResult && (
        <div>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Last Scan Feedback
            </span>
          </div>
          <ScanResultCard result={lastResult} />
        </div>
      )}

      {/* Session Scan History */}
      <ScanHistory history={history} />
    </div>
  );
}

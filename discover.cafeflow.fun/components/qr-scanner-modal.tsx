"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, QrCode, AlertCircle, Camera, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import jsQR from "jsqr";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [validating, setValidating] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setErrorMsg("");
    setScannedResult(null);
    setValidating(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        setErrorMsg("Camera access is not supported on this browser/device.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      console.warn("[QR Scanner] Camera error:", err);
      setHasCameraPermission(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission denied. Please allow camera access in your browser settings to scan table QR codes.");
      } else {
        setErrorMsg("Unable to access camera. Please check camera permissions or try again.");
      }
    }
  };

  const handleValidCafeflowUrl = async (parsedUrl: URL) => {
    setValidating(true);
    setErrorMsg("");

    const pathname = parsedUrl.pathname; // e.g. /cafe/artisan-brew or /artisan-brew/menu
    const tableParam = parsedUrl.searchParams.get("table");
    const modeParam = parsedUrl.searchParams.get("mode") || "dine_in";

    // 1. Path format: /cafe/[slug] or /[slug]/menu or /[slug]
    let slug = "";
    if (pathname.startsWith("/cafe/")) {
      slug = pathname.replace("/cafe/", "").split("/")[0];
    } else if (pathname.includes("/menu")) {
      slug = pathname.split("/menu")[0].replace(/^\//, "");
    } else {
      slug = pathname.replace(/^\//, "").split("/")[0];
    }

    if (!slug || slug === "search" || slug === "orders" || slug === "profile" || slug === "cart") {
      setValidating(false);
      setErrorMsg("Invalid CafeFlow QR Code. Please scan a designated cafe table QR code.");
      return;
    }

    // Stop scanning stream immediately
    stopCamera();

    // Build redirection URL on Discover platform
    let target = `/cafe/${encodeURIComponent(slug)}`;
    const queryParts = [];
    if (tableParam) queryParts.push(`table=${encodeURIComponent(tableParam)}`);
    if (modeParam) queryParts.push(`mode=${encodeURIComponent(modeParam)}`);
    if (queryParts.length > 0) target += `?${queryParts.join("&")}`;

    setTimeout(() => {
      onClose();
      router.push(target);
    }, 400);
  };

  const processQRCode = (rawText: string) => {
    if (!rawText || validating) return;

    // Check if it's a valid CafeFlow QR code
    let parsedUrl: URL | null = null;
    try {
      if (rawText.startsWith("http://") || rawText.startsWith("https://")) {
        parsedUrl = new URL(rawText);
      } else if (rawText.startsWith("/")) {
        parsedUrl = new URL(rawText, window.location.origin);
      } else if (rawText.includes("table=")) {
        parsedUrl = new URL(rawText.startsWith("?") ? rawText : `?${rawText}`, window.location.href);
      }
    } catch {
      parsedUrl = null;
    }

    if (!parsedUrl) {
      setErrorMsg("Invalid QR Code. Please scan an authentic CafeFlow cafe table QR code.");
      return;
    }

    const host = parsedUrl.hostname.toLowerCase();
    const isCafeflowDomain =
      host.endsWith("cafeflow.fun") ||
      host === "cafeflow.fun" ||
      host.includes("localhost") ||
      host.includes("127.0.0.1");

    if (!isCafeflowDomain) {
      setErrorMsg("Invalid QR Code. This is not a CafeFlow QR code.");
      return;
    }

    setScannedResult(rawText);
    handleValidCafeflowUrl(parsedUrl);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || validating) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });

      if (code && code.data) {
        processQRCode(code.data.trim());
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-[#151A18] rounded-[28px] overflow-hidden border border-[#E9E8E2] dark:border-[#242B27] shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 flex items-center justify-between border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E6F0DD] dark:bg-[#002D23]/40 text-[#002D23] dark:text-[#34D399] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#191D1B] dark:text-white leading-tight">
                Scan Cafe Table QR
              </h3>
              <p className="text-[11px] text-[#777D79] dark:text-stone-400">
                Order directly from your table
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay Box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Darkened mask */}
            <div className="w-56 h-56 relative rounded-2xl border-2 border-dashed border-[#34D399] shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#34D399] rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#34D399] rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#34D399] rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#34D399] rounded-br-xl" />

              {/* Scanning red line animation */}
              {!validating && (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#34D399] to-transparent animate-pulse shadow-[0_0_8px_#34D399]" />
              )}

              {validating && (
                <div className="flex flex-col items-center gap-2 p-3 bg-black/70 rounded-xl backdrop-blur-xs text-white">
                  <Loader2 className="w-6 h-6 animate-spin text-[#34D399]" />
                  <span className="text-xs font-bold">Verifying CafeFlow QR...</span>
                </div>
              )}
            </div>
          </div>

          {/* Fallback if camera permission fails */}
          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-stone-900/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 z-20">
              <Camera className="w-10 h-10 text-stone-400" />
              <p className="text-xs text-stone-300 max-w-xs">{errorMsg}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-full bg-[#002D23] text-white text-xs font-bold flex items-center gap-2 shadow-xs hover:bg-[#002f24]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer / Status Feedback */}
        <div className="p-4 space-y-3 bg-[#FAF8F4] dark:bg-[#111413]">
          {errorMsg && hasCameraPermission !== false && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          <div className="text-center space-y-1">
            <p className="text-[11px] text-[#777D79] dark:text-stone-400">
              Point your camera at any CafeFlow table QR code.
            </p>
            <p className="text-[10px] text-stone-400">
              Only authentic CafeFlow QR codes are recognized.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

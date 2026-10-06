"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeBarcodeScanResult, preferredBarcodeFormats } from "@/domain/barcodeScanner";

type ScannerState = "idle" | "starting" | "ready" | "scanning";

type NativeBarcode = {
  rawValue?: string;
  format?: string;
};

type NativeBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<NativeBarcode[]>;
};

type NativeBarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: NativeBarcodeDetectorConstructor;
  }
}

type BarcodeScannerProps = {
  onDetect: (barcode: string) => void;
};

export function BarcodeScanner({ onDetect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<NativeBarcodeDetector | null>(null);
  const frameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const scanAttemptRef = useRef(0);
  const scannerGenerationRef = useRef(0);
  const onDetectRef = useRef(onDetect);
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isCameraOpen = scannerState !== "idle";

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const cancelScanLoop = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    isDetectingRef.current = false;
  }, []);

  const stopCamera = useCallback(() => {
    scannerGenerationRef.current += 1;
    cancelScanLoop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    scanAttemptRef.current = 0;
    setScannerState("idle");
  }, [cancelScanLoop]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  async function openCamera() {
    if (typeof window === "undefined" || !window.BarcodeDetector) {
      setMessage("Tu navegador todavía no tiene escáner de códigos. Escribe el código manualmente; el campo sigue listo.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Este navegador no permite abrir la cámara aquí. Puedes escribir el código manualmente.");
      return;
    }

    const generation = scannerGenerationRef.current + 1;
    scannerGenerationRef.current = generation;
    setScannerState("starting");
    setMessage(null);

    try {
      const supportedFormats = await window.BarcodeDetector.getSupportedFormats?.();
      if (scannerGenerationRef.current !== generation) return;

      const formats = supportedFormats
        ? preferredBarcodeFormats.filter((format) => supportedFormats.includes(format))
        : [...preferredBarcodeFormats];

      if (supportedFormats && formats.length === 0) {
        setScannerState("idle");
        setMessage("Tu navegador tiene escáner, pero no soporta códigos comerciales comunes. Escribe el código manualmente.");
        return;
      }

      detectorRef.current = new window.BarcodeDetector({ formats });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (scannerGenerationRef.current !== generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (scannerGenerationRef.current !== generation) {
        if (streamRef.current === stream) streamRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setScannerState("ready");
      setMessage("Apunta al código. Al detectarlo se llena solo este campo; el precio y la cantidad no cambian.");
      startScanLoop(generation);
    } catch {
      stopCamera();
      setMessage("No pudimos abrir o usar la cámara. Revisa permisos del navegador o escribe el código manualmente.");
    }
  }

  function startScanLoop(generation: number) {
    cancelScanLoop();

    const scanFrame = async () => {
      const detector = detectorRef.current;
      const video = videoRef.current;

      if (scannerGenerationRef.current !== generation || !detector || !video || !streamRef.current) return;

      if (!isDetectingRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        isDetectingRef.current = true;
        setScannerState("scanning");
        try {
          const results = await detector.detect(video);
          if (scannerGenerationRef.current !== generation || !streamRef.current) return;

          const barcode = normalizeBarcodeScanResult(results[0]);
          if (barcode) {
            onDetectRef.current(barcode);
            stopCamera();
            setMessage(null);
            return;
          }

          scanAttemptRef.current += 1;
          if (scanAttemptRef.current === 12) {
            setMessage("Todavía no encontramos un código claro. Acércate, mejora la luz o escribe el código manualmente.");
          }
        } catch {
          if (scannerGenerationRef.current === generation) {
            setMessage("No pudimos leer el código con esta cámara. Puedes cerrar y escribirlo manualmente.");
          }
        } finally {
          if (scannerGenerationRef.current === generation) {
            isDetectingRef.current = false;
            if (streamRef.current) setScannerState("ready");
          }
        }
      }

      if (scannerGenerationRef.current === generation && streamRef.current) frameRef.current = window.requestAnimationFrame(scanFrame);
    };

    frameRef.current = window.requestAnimationFrame(scanFrame);
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-3">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-black text-presucart-tinta">Escanear código con cámara</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Opcional: identifica el producto. Nunca cambia precio ni cantidad.</p>
        </div>
        {isCameraOpen ? (
          <button type="button" onClick={stopCamera} className="min-h-12 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700">
            Cerrar escáner
          </button>
        ) : (
          <button type="button" onClick={openCamera} className="min-h-12 rounded-2xl bg-presucart-tinta px-4 py-3 font-black text-white">
            Escanear código
          </button>
        )}
      </div>

      {isCameraOpen ? (
        <div className="mt-3 space-y-2">
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-2xl bg-slate-900 object-cover" />
          <p className="text-xs font-semibold text-slate-600">{scannerState === "starting" ? "Abriendo cámara..." : "Buscando código en vivo..."}</p>
        </div>
      ) : null}

      {message ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{message}</p> : null}
    </div>
  );
}

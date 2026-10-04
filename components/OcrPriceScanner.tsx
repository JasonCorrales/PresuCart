"use client";

import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { extractPriceCandidates, formatOcrCandidateAmount, type PriceCandidate } from "@/domain/ocrPrice";

type ScannerState = "idle" | "starting" | "ready" | "processing";

type OcrPriceScannerProps = {
  onSelectCandidate: (amount: number) => void;
};

export function OcrPriceScanner({ onSelectCandidate }: OcrPriceScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ocrJobRef = useRef(0);
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<PriceCandidate[]>([]);
  const isCameraOpen = scannerState !== "idle";

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function openCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite usar la cámara desde esta pantalla. Puedes ingresar el precio manualmente.");
      return;
    }

    setScannerState("starting");
    setError(null);
    setCandidates([]);
    setProgress(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScannerState("ready");
    } catch {
      setScannerState("idle");
      stopCamera();
      setError("No pudimos abrir la cámara. Revisa permisos del navegador o escribe el precio manualmente.");
    }
  }

  function stopCamera() {
    ocrJobRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerState("idle");
    setProgress(null);
  }

  async function captureAndProcess() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("La cámara aún no está lista. Intenta de nuevo en unos segundos.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d", { willReadFrequently: false });
    if (!context) {
      setError("No pudimos preparar la imagen temporal. Ingresa el precio manualmente.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setScannerState("processing");
    setError(null);
    setCandidates([]);
    setProgress(0);

    const ocrJob = ++ocrJobRef.current;

    try {
      const result = await Tesseract.recognize(canvas, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.round(message.progress * 100));
        },
      });
      if (ocrJob !== ocrJobRef.current) return;
      const nextCandidates = extractPriceCandidates(result.data.text);
      setCandidates(nextCandidates);
      if (nextCandidates.length === 0) {
        setError("No encontramos precios claros en la captura. Puedes acercarte más o ingresar el precio manualmente.");
      }
    } catch {
      if (ocrJob === ocrJobRef.current) setError("No pudimos leer la captura. Intenta otra vez o ingresa el precio manualmente.");
    } finally {
      if (ocrJob === ocrJobRef.current) {
        setScannerState(streamRef.current ? "ready" : "idle");
        setProgress(null);
      }
    }
  }

  function selectCandidate(amount: number) {
    onSelectCandidate(amount);
    stopCamera();
  }

  return (
    <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-black text-presucart-tinta">Escáner local de precio</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Captura una etiqueta y confirma un candidato; la imagen no se guarda ni se sube.</p>
        </div>
        {isCameraOpen ? (
          <button type="button" onClick={stopCamera} className="min-h-12 rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700">
            Cerrar cámara
          </button>
        ) : (
          <button type="button" onClick={openCamera} className="min-h-14 rounded-2xl bg-presucart-tinta px-5 py-4 text-lg font-black text-white">
            Escanear precio
          </button>
        )}
      </div>

      {isCameraOpen ? (
        <div className="mt-4 space-y-3">
          <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full rounded-3xl bg-slate-900 object-cover" />
          <button
            type="button"
            onClick={captureAndProcess}
            disabled={scannerState !== "ready"}
            className="min-h-14 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-black text-white disabled:bg-slate-300"
          >
            {scannerState === "processing" ? `Procesando${progress === null ? "..." : ` ${progress}%`}` : scannerState === "starting" ? "Abriendo cámara..." : "Capturar precio"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{error}</p> : null}

      {candidates.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-black uppercase tracking-wide text-emerald-800">Confirma el precio detectado</p>
          <div className="mt-3 grid gap-3">
            {candidates.map((candidate) => (
              <button
                key={`${candidate.amount}-${candidate.raw}`}
                type="button"
                onClick={() => selectCandidate(candidate.amount)}
                className="min-h-16 rounded-2xl bg-white px-5 py-4 text-2xl font-black text-presucart-tinta shadow-sm ring-2 ring-emerald-200"
              >
                {formatOcrCandidateAmount(candidate.amount)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Al tocar un candidato solo se llena el precio unitario; revisa cantidad y presiona agregar.</p>
        </div>
      ) : null}
    </div>
  );
}

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "@/components/BarcodeScanner";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("BarcodeScanner camera lifecycle", () => {
  let rafCallbacks: FrameRequestCallback[];
  let originalBarcodeDetector: typeof window.BarcodeDetector;
  let originalMediaDevices: typeof navigator.mediaDevices;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rafCallbacks = [];
    originalBarcodeDetector = window.BarcodeDetector;
    originalMediaDevices = navigator.mediaDevices;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;

    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    window.cancelAnimationFrame = vi.fn();
    playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.BarcodeDetector = originalBarcodeDetector;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: originalMediaDevices });
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    playSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("does not deliver an in-flight detection after the scanner is closed", async () => {
    const detectDeferred = createDeferred<Array<{ rawValue: string }>>();
    const detect = vi.fn(() => detectDeferred.promise);
    window.BarcodeDetector = class {
      static getSupportedFormats = vi.fn(async () => ["ean_13"]);
      detect = detect;
    } as unknown as typeof window.BarcodeDetector;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => createStream()) },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA });
    const onDetect = vi.fn();

    render(<BarcodeScanner onDetect={onDetect} />);
    fireEvent.click(screen.getByRole("button", { name: "Escanear código" }));
    await screen.findByText("Buscando código en vivo...");

    await act(async () => {
      rafCallbacks.shift()?.(1);
    });
    expect(detect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar escáner" }));
    await act(async () => {
      detectDeferred.resolve([{ rawValue: " 7441001234567 " }]);
    });

    expect(onDetect).not.toHaveBeenCalled();
  });

  it("stops tracks when camera acquisition finishes after the scanner was closed", async () => {
    const streamDeferred = createDeferred<MediaStream>();
    const stream = createStream();
    window.BarcodeDetector = class {
      static getSupportedFormats = vi.fn(async () => ["ean_13"]);
      detect = vi.fn(async () => []);
    } as unknown as typeof window.BarcodeDetector;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => streamDeferred.promise) },
    });

    render(<BarcodeScanner onDetect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Escanear código" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar escáner" }));

    await act(async () => {
      streamDeferred.resolve(stream);
    });

    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });
});

function createStream(): MediaStream {
  const tracks = [{ stop: vi.fn() }];
  return {
    getTracks: () => tracks,
  } as unknown as MediaStream;
}

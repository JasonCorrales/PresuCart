import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaLifecycle } from "@/components/PwaLifecycle";

describe("PwaLifecycle", () => {
  const originalServiceWorker = navigator.serviceWorker;
  const originalIsSecureContext = window.isSecureContext;
  let register: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    register = vi.fn(async () => undefined);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: originalIsSecureContext,
    });
  });

  it("registers /sw.js only after load and swallows registration failures", async () => {
    register.mockRejectedValueOnce(new Error("registration denied"));

    render(<PwaLifecycle />);

    expect(register).not.toHaveBeenCalled();
    await act(async () => {
      window.dispatchEvent(new Event("load"));
    });

    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js"));
  });

  it("does not register when service workers are unavailable", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    render(<PwaLifecycle />);
    await act(async () => {
      window.dispatchEvent(new Event("load"));
    });

    expect(register).not.toHaveBeenCalled();
  });

  it("cleans up online and offline listeners when unmounted", async () => {
    const { unmount } = render(<PwaLifecycle />);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status").textContent).toContain("Sin conexión");

    unmount();

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.queryByRole("status")).toBeNull();
  });
});

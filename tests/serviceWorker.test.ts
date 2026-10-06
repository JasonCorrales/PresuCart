import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ServiceWorkerEvent = {
  waitUntil?: (promise: Promise<unknown>) => void;
  respondWith?: (promise: Promise<unknown>) => void;
  request?: ServiceWorkerRequest;
};

type ServiceWorkerRequest = {
  method: string;
  url: string;
  mode?: string;
};

type ListenerMap = Map<string, (event: ServiceWorkerEvent) => void>;

const swPath = path.join(process.cwd(), "public", "sw.js");
const swSource = fs.readFileSync(swPath, "utf8");

describe("public service worker runtime", () => {
  let listeners: ListenerMap;
  let cacheAddAll: ReturnType<typeof vi.fn>;
  let cachesOpen: ReturnType<typeof vi.fn>;
  let cachesKeys: ReturnType<typeof vi.fn>;
  let cachesDelete: ReturnType<typeof vi.fn>;
  let cachesMatch: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let skipWaiting: ReturnType<typeof vi.fn>;
  let clientsClaim: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = new Map();
    cacheAddAll = vi.fn(async () => undefined);
    cachesOpen = vi.fn(async () => ({ addAll: cacheAddAll }));
    cachesKeys = vi.fn(async () => ["presucart-shell-v1", "presucart-shell-v2", "presucart-drafts-v1", "other-app-cache"]);
    cachesDelete = vi.fn(async () => true);
    cachesMatch = vi.fn(async () => undefined);
    fetchMock = vi.fn(async () => ({ body: "network" }));
    skipWaiting = vi.fn();
    clientsClaim = vi.fn(async () => undefined);

    vm.runInNewContext(swSource, {
      URL,
      Promise,
      Set,
      self: {
        location: { origin: "https://app.example" },
        clients: { claim: clientsClaim },
        skipWaiting,
        addEventListener: (type: string, listener: (event: ServiceWorkerEvent) => void) => listeners.set(type, listener),
      },
      caches: {
        open: cachesOpen,
        keys: cachesKeys,
        delete: cachesDelete,
        match: cachesMatch,
      },
      fetch: fetchMock,
    });
  });

  it("precaches only the public app shell during install", async () => {
    const waitUntil = vi.fn();
    listeners.get("install")?.({ waitUntil });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];

    expect(cachesOpen).toHaveBeenCalledWith("presucart-shell-v2");
    expect(cacheAddAll).toHaveBeenCalledWith(["/", "/manifest.json", "/icons/presucart.svg"]);
    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it("deletes only old PresuCart shell caches during activation", async () => {
    const waitUntil = vi.fn();
    listeners.get("activate")?.({ waitUntil });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];

    expect(cachesDelete).toHaveBeenCalledTimes(1);
    expect(cachesDelete).toHaveBeenCalledWith("presucart-shell-v1");
    expect(cachesDelete).not.toHaveBeenCalledWith("presucart-shell-v2");
    expect(cachesDelete).not.toHaveBeenCalledWith("presucart-drafts-v1");
    expect(cachesDelete).not.toHaveBeenCalledWith("other-app-cache");
    expect(clientsClaim).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["non-GET request", request("https://app.example/manifest.json", { method: "POST" })],
    ["cross-origin request", request("https://cdn.example/icons/presucart.svg")],
    ["RSC request", request("https://app.example/?_rsc=abc")],
    ["API request", request("https://app.example/api/purchases")],
    ["dynamic app route", request("https://app.example/purchases/purchase-1")],
  ])("does not intercept %s", (_label, swRequest) => {
    const respondWith = vi.fn();

    listeners.get("fetch")?.({ request: swRequest, respondWith });

    expect(respondWith).not.toHaveBeenCalled();
    expect(cachesMatch).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses network for online navigations without writing them into cache", async () => {
    const networkResponse = { body: "live purchase page" };
    fetchMock.mockResolvedValueOnce(networkResponse);
    const respondWith = vi.fn();

    listeners.get("fetch")?.({ request: request("https://app.example/purchases", { mode: "navigate" }), respondWith });

    expect(respondWith).toHaveBeenCalledTimes(1);
    await expect(respondWith.mock.calls[0][0]).resolves.toBe(networkResponse);
    expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: "https://app.example/purchases" }));
    expect(cachesOpen).not.toHaveBeenCalled();
    expect(cachesMatch).not.toHaveBeenCalled();
  });

  it("falls back to the cached public home when navigation fails offline", async () => {
    const homeFallback = { body: "cached public home" };
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    cachesMatch.mockResolvedValueOnce(homeFallback);
    const respondWith = vi.fn();

    listeners.get("fetch")?.({ request: request("https://app.example/purchases", { mode: "navigate" }), respondWith });

    await expect(respondWith.mock.calls[0][0]).resolves.toBe(homeFallback);
    expect(cachesMatch).toHaveBeenCalledWith("/");
  });
});

function request(url: string, options: Partial<ServiceWorkerRequest> = {}): ServiceWorkerRequest {
  return {
    method: options.method ?? "GET",
    mode: options.mode,
    url,
  };
}

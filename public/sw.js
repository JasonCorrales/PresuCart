const CACHE_NAME = "presucart-shell-v2";
const APP_SHELL = ["/", "/manifest.json", "/icons/presucart.svg"];
const STATIC_ALLOWLIST = new Set(APP_SHELL);

function isSameOriginGet(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  return url.origin === self.location.origin;
}

function isStaticAllowlistedRequest(request) {
  if (!isSameOriginGet(request)) return false;

  const url = new URL(request.url);
  if (url.searchParams.has("_rsc")) return false;

  return STATIC_ALLOWLIST.has(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("presucart-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isSameOriginGet(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  if (!isStaticAllowlistedRequest(request)) return;

  event.respondWith(caches.match(request).then((cachedResponse) => cachedResponse ?? fetch(request)));
});

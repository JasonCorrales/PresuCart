"use client";

import { useEffect, useState } from "react";
import { getNetworkStatusCopy } from "@/domain/offline";

export function PwaLifecycle() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasSeenOffline, setHasSeenOffline] = useState(false);
  const [showOnlineRecovery, setShowOnlineRecovery] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateOnlineStatus = () => {
      const nextIsOnline = window.navigator.onLine;
      setIsOnline(nextIsOnline);
      if (!nextIsOnline) {
        setHasSeenOffline(true);
        setShowOnlineRecovery(false);
      } else if (hasSeenOffline) {
        setShowOnlineRecovery(true);
        window.setTimeout(() => setShowOnlineRecovery(false), 6000);
      }
    };

    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [hasSeenOffline]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!window.isSecureContext && !isLocalhost) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure should never block shopping flows.
      });
    };

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  if (isOnline && !showOnlineRecovery) return null;

  const copy = getNetworkStatusCopy(isOnline);
  const className = copy.tone === "offline" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-300 bg-emerald-50 text-emerald-950";

  return (
    <div className={`sticky top-0 z-50 border-b px-4 py-3 text-sm shadow-sm ${className}`} role="status" aria-live="polite">
      <div className="mx-auto max-w-md">
        <p className="font-black">{copy.title}</p>
        <p className="mt-1 leading-5">{copy.body}</p>
      </div>
    </div>
  );
}

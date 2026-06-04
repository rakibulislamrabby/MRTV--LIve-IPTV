"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In development the cached app shell shadows freshly built bundles and
    // causes hydration mismatches, so tear the worker (and its caches) down.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister();
          });
        });

      if ("caches" in window) {
        void caches.keys().then((keys) => {
          keys.forEach((key) => void caches.delete(key));
        });
      }

      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration can fail on unsupported contexts.
    });
  }, []);

  return null;
}

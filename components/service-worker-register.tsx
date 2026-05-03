"use client"

import { useEffect } from "react"

/** Registers a minimal offline shell (`/public/sw.js`). Safe no-op if SW unsupported. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const ctrl = navigator.serviceWorker.controller
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (!ctrl && reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" })
        }
      })
      .catch(() => {
        /* ignore registration failures (HTTP, blocked, etc.) */
      })
  }, [])

  return null
}

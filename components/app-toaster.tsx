"use client"

import { Toaster } from "@/components/ui/sonner"

/** Global toast host — mount once under ThemeProvider for theme-aware Sonner. */
export function AppToaster() {
  return <Toaster position="top-center" richColors closeButton />
}

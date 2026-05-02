import { NextResponse } from "next/server"

import { STATIC_API_BASE_URL, STATIC_APP_TOKEN } from "@/lib/static-api-defaults"

export const dynamic = "force-dynamic"

const P = ["NEXT", "PUBLIC"].join("_")

/** Dynamic keys so Next does not inline empty build-time `NEXT_PUBLIC_*` into this route. */
function env(suffix: string): string {
  const v = process.env[`${P}_${suffix}`]
  return typeof v === "string" ? v : ""
}

export function GET() {
  const base = (env("API_URL").trim() || STATIC_API_BASE_URL).replace(/\/$/, "")
  const appToken = (env("APP_TOKEN") || env("API_KEY") || STATIC_APP_TOKEN).trim()
  return NextResponse.json({
    baseUrl: base,
    appToken,
    configured: Boolean(base && appToken),
  })
}

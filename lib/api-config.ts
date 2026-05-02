/**
 * API base URL + app token for browser calls.
 *
 * Prefer NEXT_PUBLIC_* and /api/runtime-config; fall back to `static-api-defaults.ts`.
 */

import { STATIC_API_BASE_URL, STATIC_APP_TOKEN } from "@/lib/static-api-defaults"

export type ClientApiConfig = {
  baseUrl: string
  appToken: string
  configured: boolean
}

let cache: ClientApiConfig | null = null

/** Only inlined / process env — no static fallback (used to decide whether to fetch runtime). */
function fromEnvOnly(): ClientApiConfig {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "").trim()
  const appToken = (
    process.env.NEXT_PUBLIC_APP_TOKEN ??
    process.env.NEXT_PUBLIC_API_KEY ??
    ""
  ).trim()
  return { baseUrl: base, appToken, configured: Boolean(base && appToken) }
}

function mergeWithStatic(baseRaw: string, tokenRaw: string): ClientApiConfig {
  const base = (baseRaw.trim() || STATIC_API_BASE_URL).replace(/\/$/, "")
  const appToken = (tokenRaw.trim() || STATIC_APP_TOKEN).trim()
  return { baseUrl: base, appToken, configured: Boolean(base && appToken) }
}

export function getApiConfig(): ClientApiConfig {
  if (cache) return cache
  const e = fromEnvOnly()
  return mergeWithStatic(e.baseUrl, e.appToken)
}

/**
 * Call on the client after mount. Tries /api/runtime-config and /runtime-env.json, then static defaults.
 */
export async function hydrateApiConfig(): Promise<void> {
  if (cache?.configured) return

  const envOnly = fromEnvOnly()
  if (envOnly.configured) {
    cache = envOnly
    return
  }
  try {
    const api = await fetch(`/api/runtime-config?${Date.now()}`, { cache: "no-store" })
    if (api.ok) {
      const j = (await api.json()) as { baseUrl?: unknown; appToken?: unknown }
      const merged = mergeWithStatic(String(j.baseUrl ?? ""), String(j.appToken ?? ""))
      if (merged.configured) {
        cache = merged
        return
      }
    }
    const res = await fetch(`/runtime-env.json?${Date.now()}`, { cache: "no-store" })
    if (res.ok) {
      const j = (await res.json()) as { baseUrl?: unknown; appToken?: unknown }
      const merged = mergeWithStatic(String(j.baseUrl ?? ""), String(j.appToken ?? ""))
      if (merged.configured) {
        cache = merged
        return
      }
    }
  } catch {
    /* offline */
  }
  cache = mergeWithStatic("", "")
}

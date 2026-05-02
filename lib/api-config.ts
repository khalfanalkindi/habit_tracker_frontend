/**
 * API base URL + app token for browser calls.
 *
 * 1) Next may inline NEXT_PUBLIC_* at build time (often empty in Docker on Railway).
 * 2) If still unconfigured, we load /runtime-env.json written at container start from real env.
 */

export type ClientApiConfig = {
  baseUrl: string
  appToken: string
  configured: boolean
}

let cache: ClientApiConfig | null = null

function fromBuildTime(): ClientApiConfig {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")
  const appToken = (
    process.env.NEXT_PUBLIC_APP_TOKEN ??
    process.env.NEXT_PUBLIC_API_KEY ??
    ""
  ).trim()
  return { baseUrl: base, appToken, configured: Boolean(base && appToken) }
}

export function getApiConfig(): ClientApiConfig {
  if (cache) return cache
  return fromBuildTime()
}

/**
 * Call once on the client after mount. Fetches /runtime-env.json when the build-time
 * bundle did not receive NEXT_PUBLIC_* (typical Railway Docker + Next).
 */
export async function hydrateApiConfig(): Promise<void> {
  if (cache?.configured) return

  const built = fromBuildTime()
  if (built.configured) {
    cache = built
    return
  }
  try {
    const res = await fetch(`/runtime-env.json?${Date.now()}`, { cache: "no-store" })
    if (res.ok) {
      const j = (await res.json()) as { baseUrl?: unknown; appToken?: unknown }
      const base = String(j.baseUrl ?? "")
        .trim()
        .replace(/\/$/, "")
      const appToken = String(j.appToken ?? "").trim()
      if (base && appToken) {
        cache = { baseUrl: base, appToken, configured: true }
        return
      }
    }
  } catch {
    /* offline / missing file */
  }
  cache = built
}

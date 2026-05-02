/**
 * Backend API client. Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_API_KEY in .env.local
 * (same value as server API_STATIC_KEY when enabled).
 */

const TOKEN_KEY = "habit-tracker-access-token"

export function getApiConfig() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")
  const key = process.env.NEXT_PUBLIC_API_KEY ?? ""
  return { baseUrl: base, apiKey: key, configured: Boolean(base && key) }
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: { id: string; email: string; display_name: string; username: string }
}

export type ProfileRead = {
  heightM: number | null
  weightKg: number | null
  dailyCaloriesTarget: number | null
  weightGoalKg: number | null
  birthday: string | null
  gender: "male" | "female" | null
}

export async function apiLogin(identifier: string, password: string): Promise<LoginResponse> {
  const { baseUrl, apiKey, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: unknown }
    const d = err.detail
    const msg = Array.isArray(d)
      ? d.map((x: { msg?: string }) => x.msg ?? "").join("; ")
      : typeof d === "string"
        ? d
        : res.statusText
    throw new Error(msg || res.statusText)
  }
  return res.json() as Promise<LoginResponse>
}

export async function apiGetProfile(token: string): Promise<ProfileRead> {
  const { baseUrl, apiKey, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/profile`, {
    headers: { "X-API-Key": apiKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<ProfileRead>
}

export async function apiPutProfile(token: string, body: ProfileRead): Promise<ProfileRead> {
  const { baseUrl, apiKey, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<ProfileRead>
}

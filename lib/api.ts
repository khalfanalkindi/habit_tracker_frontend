/**
 * Backend API client.
 * URL + token: NEXT_PUBLIC_* at build time, or /runtime-env.json at runtime (see Dockerfile).
 */

import { getApiConfig } from "@/lib/api-config"

export { getApiConfig, hydrateApiConfig } from "@/lib/api-config"

function authHeaders(): HeadersInit {
  const { appToken } = getApiConfig()
  return { Authorization: `Bearer ${appToken}` }
}

export type LoginResponse = {
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
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
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

export async function apiGetProfile(): Promise<ProfileRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/profile`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<ProfileRead>
}

export async function apiPutProfile(body: ProfileRead): Promise<ProfileRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<ProfileRead>
}

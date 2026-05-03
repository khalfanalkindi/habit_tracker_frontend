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

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Accept camelCase (preferred) or snake_case from FastAPI JSON. */
export function normalizeProfileRead(raw: unknown): ProfileRead {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid profile response")
  }
  const o = raw as Record<string, unknown>
  const heightM = num(o.heightM ?? o.height_m)
  const weightKg = num(o.weightKg ?? o.weight_kg)
  const dailyCaloriesTarget =
    typeof o.dailyCaloriesTarget === "number" && Number.isFinite(o.dailyCaloriesTarget)
      ? Math.trunc(o.dailyCaloriesTarget)
      : typeof o.daily_calories_target === "number" && Number.isFinite(o.daily_calories_target)
        ? Math.trunc(o.daily_calories_target)
        : null
  const weightGoalKg = num(o.weightGoalKg ?? o.weight_goal_kg)
  let birthday: string | null = null
  const bd = o.birthday
  if (typeof bd === "string") {
    const m = bd.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) birthday = m[1]
  }
  const g = o.gender
  const gender = g === "male" || g === "female" ? g : null
  return {
    heightM,
    weightKg,
    dailyCaloriesTarget,
    weightGoalKg,
    birthday,
    gender,
  }
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
  return normalizeProfileRead(await res.json())
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
  return normalizeProfileRead(await res.json())
}

/** Payload for PUT /api/me/profile (no local-only fields). */
export function profileToApiBody(p: {
  heightM: number | null
  weightKg: number | null
  dailyCaloriesTarget: number | null
  weightGoalKg: number | null
  birthday: string | null
  gender: "male" | "female" | null
}): ProfileRead {
  return {
    heightM: p.heightM,
    weightKg: p.weightKg,
    dailyCaloriesTarget: p.dailyCaloriesTarget,
    weightGoalKg: p.weightGoalKg,
    birthday: p.birthday,
    gender: p.gender,
  }
}

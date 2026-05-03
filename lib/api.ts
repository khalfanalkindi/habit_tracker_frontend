/**
 * Backend API client.
 * URL + token: NEXT_PUBLIC_* at build time, or /runtime-env.json at runtime (see Dockerfile).
 */

import { AUTH_USER_STORAGE_KEY } from "@/lib/auth-constants"
import { getApiConfig } from "@/lib/api-config"

export { getApiConfig, hydrateApiConfig } from "@/lib/api-config"

/** Turn FastAPI `422` / error JSON into a single readable string for the UI. */
export function formatFastApiErrorBody(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed"
  const detail = (data as { detail?: unknown }).detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    const parts = detail.map((item: unknown) => {
      if (!item || typeof item !== "object") return ""
      const o = item as { msg?: unknown; loc?: unknown[] }
      const msg = typeof o.msg === "string" ? o.msg : ""
      const loc = Array.isArray(o.loc) ? o.loc.filter((x) => typeof x === "string").join(".") : ""
      if (msg && loc) return `${loc}: ${msg}`
      return msg || JSON.stringify(item)
    })
    return parts.filter(Boolean).join(" · ") || "Request failed"
  }
  return "Request failed"
}

function errorMessageFromResponse(res: Response, data: unknown): string {
  if (typeof data === "object" && data !== null) {
    const m = formatFastApiErrorBody(data)
    if (m !== "Request failed") return m
  }
  return res.statusText || "Request failed"
}

function userIdHeader(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) return {}
    const u = JSON.parse(raw) as { id?: string }
    if (typeof u.id === "string" && u.id && u.id !== "demo") {
      return { "X-User-Id": u.id }
    }
  } catch {
    /* ignore */
  }
  return {}
}

function authHeaders(): HeadersInit {
  const { appToken } = getApiConfig()
  return { Authorization: `Bearer ${appToken}`, ...userIdHeader() }
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
    const err: unknown = await res.json().catch(() => ({}))
    const msg = formatFastApiErrorBody(err)
    throw new Error(msg === "Request failed" ? res.statusText || msg : msg)
  }
  return res.json() as Promise<LoginResponse>
}

export async function apiGetProfile(): Promise<ProfileRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/profile`, { headers: authHeaders() })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeProfileRead(data)
}

export async function apiPutProfile(body: ProfileRead): Promise<ProfileRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeProfileRead(data)
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

// --- Food options (/api/me/food-options) ---

export type FoodOptionRead = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: number
  servingUnit: string
}

export function normalizeFoodOption(raw: unknown): FoodOptionRead {
  if (!raw || typeof raw !== "object") throw new Error("Invalid food option")
  const o = raw as Record<string, unknown>
  const id = typeof o.id === "string" ? o.id : ""
  const name = typeof o.name === "string" ? o.name : ""
  const calories = num(o.calories ?? o.calories_per_serving) ?? 0
  const protein = num(o.protein ?? o.protein_g_per_serving) ?? 0
  const carbs = num(o.carbs ?? o.carbs_g_per_serving) ?? 0
  const fat = num(o.fat ?? o.fat_g_per_serving) ?? 0
  const servingSize = num(o.servingSize ?? o.serving_size) ?? 0
  const servingUnit =
    typeof o.servingUnit === "string"
      ? o.servingUnit
      : typeof o.serving_unit === "string"
        ? o.serving_unit
        : ""
  return { id, name, calories, protein, carbs, fat, servingSize, servingUnit }
}

export async function apiListFoodOptions(): Promise<FoodOptionRead[]> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/food-options`, { headers: authHeaders() })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  if (!Array.isArray(data)) throw new Error("Invalid food options list")
  return data.map((item) => normalizeFoodOption(item))
}

export async function apiPostFoodOption(
  body: Omit<FoodOptionRead, "id">
): Promise<FoodOptionRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/food-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name: body.name,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
      servingSize: body.servingSize,
      servingUnit: body.servingUnit,
    }),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeFoodOption(data)
}

export async function apiPatchFoodOption(
  id: string,
  patch: Partial<Omit<FoodOptionRead, "id">>
): Promise<FoodOptionRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/food-options/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeFoodOption(data)
}

export async function apiDeleteFoodOption(id: string): Promise<void> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/food-options/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (res.status === 204) return
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
}

// --- Food log entries (/api/me/food-log-entries) ---

export type FoodLogEntryRead = {
  id: string
  logDate: string
  foodOptionId: string
  mealType: string
  quantity: number
}

export function normalizeFoodLogEntry(raw: unknown): FoodLogEntryRead {
  if (!raw || typeof raw !== "object") throw new Error("Invalid food log entry")
  const o = raw as Record<string, unknown>
  const id = typeof o.id === "string" ? o.id : ""
  let logDate = ""
  const ld = o.logDate ?? o.log_date
  if (typeof ld === "string") {
    const m = ld.match(/^(\d{4}-\d{2}-\d{2})/)
    logDate = m ? m[1] : ld.slice(0, 10)
  }
  const foodOptionId =
    typeof o.foodOptionId === "string"
      ? o.foodOptionId
      : typeof o.food_option_id === "string"
        ? o.food_option_id
        : ""
  const mealType =
    typeof o.mealType === "string"
      ? o.mealType
      : typeof o.meal_type === "string"
        ? o.meal_type
        : ""
  const quantity = num(o.quantity) ?? 0
  return { id, logDate, foodOptionId, mealType, quantity }
}

export async function apiListFoodLogEntries(params?: {
  date?: string
  from?: string
  to?: string
}): Promise<FoodLogEntryRead[]> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const sp = new URLSearchParams()
  if (params?.date) sp.set("date", params.date)
  if (params?.from) sp.set("from", params.from)
  if (params?.to) sp.set("to", params.to)
  const q = sp.toString()
  const url = `${baseUrl}/api/me/food-log-entries${q ? `?${q}` : ""}`
  const res = await fetch(url, { headers: authHeaders() })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  if (!Array.isArray(data)) throw new Error("Invalid food log list")
  return data.map((item) => normalizeFoodLogEntry(item))
}

export async function apiPostFoodLogEntry(body: {
  logDate: string
  foodOptionId: string
  mealType: string
  quantity: number
}): Promise<FoodLogEntryRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/food-log-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      logDate: body.logDate,
      foodOptionId: body.foodOptionId,
      mealType: body.mealType,
      quantity: body.quantity,
    }),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeFoodLogEntry(data)
}

export async function apiDeleteFoodLogEntry(id: string): Promise<void> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/food-log-entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (res.status === 204) return
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
}

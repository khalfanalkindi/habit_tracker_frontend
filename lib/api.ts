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
  /** ISO datetime — client treats session as expired after this instant. */
  sessionExpiresAt?: string
}

function parseLoginResponse(raw: unknown): LoginResponse {
  if (!raw || typeof raw !== "object") throw new Error("Invalid login response")
  const o = raw as Record<string, unknown>
  const u = o.user
  if (!u || typeof u !== "object") throw new Error("Invalid login response")
  const ur = u as Record<string, unknown>
  const id = typeof ur.id === "string" ? ur.id : ""
  const email = typeof ur.email === "string" ? ur.email : ""
  const display_name =
    typeof ur.displayName === "string"
      ? ur.displayName
      : typeof ur.display_name === "string"
        ? ur.display_name
        : ""
  const username = typeof ur.username === "string" ? ur.username : ""
  const sessionRaw = o.sessionExpiresAt ?? o.session_expires_at
  const sessionExpiresAt = typeof sessionRaw === "string" ? sessionRaw : undefined
  return {
    user: { id, email, display_name, username },
    sessionExpiresAt,
  }
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
  const data: unknown = await res.json()
  return parseLoginResponse(data)
}

const DEFAULT_SESSION_MS = 14 * 24 * 60 * 60 * 1000

export function defaultSessionExpiresAtIso(): string {
  return new Date(Date.now() + DEFAULT_SESSION_MS).toISOString()
}

export async function apiChangePassword(input: {
  identifier: string
  oldPassword: string
  newPassword: string
}): Promise<void> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      identifier: input.identifier.trim(),
      oldPassword: input.oldPassword,
      newPassword: input.newPassword,
    }),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
}

export type ForgotPasswordResponse = {
  message: string
  resetLink?: string | null
}

export async function apiForgotPassword(identifier: string): Promise<ForgotPasswordResponse> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ identifier: identifier.trim() }),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  if (!data || typeof data !== "object") throw new Error("Invalid response")
  const o = data as Record<string, unknown>
  const message = typeof o.message === "string" ? o.message : ""
  const resetLink = typeof o.resetLink === "string" ? o.resetLink : undefined
  return { message, resetLink }
}

export async function apiResetPassword(token: string, newPassword: string): Promise<void> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ token: token.trim(), newPassword }),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
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

// --- Exercise entries (/api/me/exercise-entries) ---

export type ExerciseEntryRead = {
  id: string
  dayOfWeek: number
  exerciseType: string
  duration: number | null
  completed: boolean
  date: string | null
}

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    if (Number.isFinite(n)) return Math.trunc(n)
  }
  return null
}

export function normalizeExerciseEntry(raw: unknown): ExerciseEntryRead {
  if (!raw || typeof raw !== "object") throw new Error("Invalid exercise entry")
  const o = raw as Record<string, unknown>
  const id = typeof o.id === "string" ? o.id : ""
  const dow = o.dayOfWeek ?? o.day_of_week
  let dayOfWeek = 0
  if (typeof dow === "number" && Number.isFinite(dow)) dayOfWeek = Math.trunc(dow)
  else if (typeof dow === "string" && dow.trim() !== "") {
    const n = parseInt(dow, 10)
    if (Number.isFinite(n)) dayOfWeek = n
  }
  dayOfWeek = Math.min(6, Math.max(0, dayOfWeek))
  const et =
    typeof o.exerciseType === "string"
      ? o.exerciseType
      : typeof o.exercise_type === "string"
        ? o.exercise_type
        : ""
  const dur = o.duration ?? o.duration_minutes
  const duration = intOrNull(dur)
  const completed = Boolean(o.completed)
  let date: string | null = null
  const d = o.date ?? o.completed_on_date ?? o.completedOnDate
  if (typeof d === "string") {
    const m = d.match(/^(\d{4}-\d{2}-\d{2})/)
    date = m ? m[1] : d.slice(0, 10)
  }
  return {
    id,
    dayOfWeek,
    exerciseType: et,
    duration,
    completed,
    date,
  }
}

export async function apiListExerciseEntries(params?: {
  dayOfWeek?: number
}): Promise<ExerciseEntryRead[]> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const sp = new URLSearchParams()
  if (params?.dayOfWeek !== undefined && params.dayOfWeek !== null) {
    sp.set("dayOfWeek", String(params.dayOfWeek))
  }
  const q = sp.toString()
  const url = `${baseUrl}/api/me/exercise-entries${q ? `?${q}` : ""}`
  const res = await fetch(url, { headers: authHeaders() })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  if (!Array.isArray(data)) throw new Error("Invalid exercise list")
  return data.map((item) => normalizeExerciseEntry(item))
}

export async function apiPostExerciseEntry(body: {
  dayOfWeek: number
  exerciseType: string
  duration?: number | null
  completed?: boolean
  date?: string | null
}): Promise<ExerciseEntryRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const payload: Record<string, unknown> = {
    dayOfWeek: body.dayOfWeek,
    exerciseType: body.exerciseType,
    completed: body.completed ?? false,
  }
  if (body.duration !== undefined) payload.duration = body.duration
  if (body.date !== undefined) payload.date = body.date
  const res = await fetch(`${baseUrl}/api/me/exercise-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeExerciseEntry(data)
}

export async function apiPatchExerciseEntry(
  id: string,
  patch: {
    dayOfWeek?: number
    exerciseType?: string
    duration?: number | null
    completed?: boolean
    date?: string | null
  }
): Promise<ExerciseEntryRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const payload: Record<string, unknown> = {}
  if (patch.dayOfWeek !== undefined) payload.dayOfWeek = patch.dayOfWeek
  if (patch.exerciseType !== undefined) payload.exerciseType = patch.exerciseType
  if ("duration" in patch) payload.duration = patch.duration
  if (patch.completed !== undefined) payload.completed = patch.completed
  if ("date" in patch) payload.date = patch.date
  const res = await fetch(`${baseUrl}/api/me/exercise-entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeExerciseEntry(data)
}

export async function apiDeleteExerciseEntry(id: string): Promise<void> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/exercise-entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (res.status === 204) return
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
}

/** One weight log per calendar day — matches backend `WeightEntryRead` (`date`, `weightKg`). */
export type WeightEntryRead = {
  id: string
  date: string
  weightKg: number
}

export function normalizeWeightEntry(raw: unknown): WeightEntryRead {
  if (!raw || typeof raw !== "object") throw new Error("Invalid weight entry")
  const o = raw as Record<string, unknown>
  const id = typeof o.id === "string" ? o.id : ""
  const w = num(o.weightKg ?? o.weight_kg)
  if (w == null || w <= 0) throw new Error("Invalid weight value")
  let ds = ""
  const d = o.date ?? o.logged_date ?? o.loggedDate
  if (typeof d === "string") {
    const m = d.match(/^(\d{4}-\d{2}-\d{2})/)
    ds = m ? m[1] : d.slice(0, 10)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) throw new Error("Invalid weight entry date")
  return { id, date: ds, weightKg: w }
}

export type WeightListParams = { date?: string; from?: string; to?: string }

export async function apiListWeightEntries(params?: WeightListParams): Promise<WeightEntryRead[]> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const sp = new URLSearchParams()
  if (params?.date) sp.set("date", params.date)
  if (params?.from) sp.set("from", params.from)
  if (params?.to) sp.set("to", params.to)
  const q = sp.toString()
  const url = `${baseUrl}/api/me/weight-entries${q ? `?${q}` : ""}`
  const res = await fetch(url, { headers: authHeaders() })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  if (!Array.isArray(data)) throw new Error("Invalid weight list response")
  return data.map((row) => normalizeWeightEntry(row))
}

export async function apiPostWeightEntry(input: {
  date: string
  weightKg: number
}): Promise<WeightEntryRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/weight-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ date: input.date, weightKg: input.weightKg }),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeWeightEntry(data)
}

export async function apiPatchWeightEntry(
  id: string,
  patch: { date?: string; weightKg?: number },
): Promise<WeightEntryRead> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const body: Record<string, unknown> = {}
  if (patch.date !== undefined) body.date = patch.date
  if (patch.weightKg !== undefined) body.weightKg = patch.weightKg
  const res = await fetch(`${baseUrl}/api/me/weight-entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
  return normalizeWeightEntry(data)
}

export async function apiDeleteWeightEntry(id: string): Promise<void> {
  const { baseUrl, configured } = getApiConfig()
  if (!configured) throw new Error("API not configured")
  const res = await fetch(`${baseUrl}/api/me/weight-entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (res.status === 204) return
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessageFromResponse(res, data))
}

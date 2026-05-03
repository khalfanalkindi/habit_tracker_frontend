"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import {
  apiDeleteWeightEntry,
  apiGetProfile,
  apiListWeightEntries,
  apiPatchWeightEntry,
  apiPostWeightEntry,
  type ProfileRead,
  type WeightEntryRead,
} from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

const STORAGE_KEY = "habit-tracker-profile"

export type WeightHistoryEntry = {
  id: string
  /** Local calendar date YYYY-MM-DD */
  date: string
  weightKg: number
}

/** Matches backend ENUM / optional profile fields */
export type ProfileGender = "male" | "female"

export type UserProfile = {
  /** Height in meters */
  heightM: number | null
  /** Latest / settings weight reference (kg) */
  weightKg: number | null
  dailyCaloriesTarget: number | null
  weightGoalKg: number | null
  /** Optional; local calendar YYYY-MM-DD */
  birthday: string | null
  gender: ProfileGender | null
  weightHistory: WeightHistoryEntry[]
}

const defaultProfile: UserProfile = {
  heightM: null,
  weightKg: null,
  dailyCaloriesTarget: null,
  weightGoalKg: null,
  birthday: null,
  gender: null,
  weightHistory: [],
}

/** Validate/normalize birthday from UI (YYYY-MM-DD) or return null. */
export function parseProfileBirthday(raw: string): string | null {
  const s = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, mo, d] = s.split("-").map(Number)
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return s
}

function parseGender(raw: unknown): ProfileGender | null {
  if (raw === "male" || raw === "female") return raw
  return null
}

function todayLocalYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Merge server profile fields into local state (keeps weightHistory and other local-only data). */
export function mergeUserProfileFromServer(local: UserProfile, server: ProfileRead): UserProfile {
  const g = server.gender === "male" || server.gender === "female" ? server.gender : null
  let b: string | null = null
  if (typeof server.birthday === "string") {
    const m = server.birthday.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) b = m[1]
  }
  const wk = server.weightKg
  let weightHistory = local.weightHistory
  if (typeof wk === "number" && Number.isFinite(wk) && wk > 0) {
    const d = todayLocalYMD()
    const existing = local.weightHistory.find((e) => e.date === d)
    const entry: WeightHistoryEntry = existing
      ? { ...existing, weightKg: wk }
      : { id: crypto.randomUUID(), date: d, weightKg: wk }
    weightHistory = [...local.weightHistory.filter((e) => e.date !== d), entry].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
  }
  return {
    ...local,
    heightM: server.heightM ?? null,
    weightKg: server.weightKg ?? null,
    dailyCaloriesTarget: server.dailyCaloriesTarget ?? null,
    weightGoalKg: server.weightGoalKg ?? null,
    birthday: b,
    gender: g,
    weightHistory,
  }
}

/** Merge profile from GET /profile; if the server returned any weight rows, use them as history. */
function applyProfileAndOptionalWeightHistory(
  local: UserProfile,
  server: ProfileRead,
  weightsFromApi: WeightEntryRead[],
): UserProfile {
  let next = mergeUserProfileFromServer(local, server)
  if (weightsFromApi.length > 0) {
    next = {
      ...next,
      weightHistory: weightsFromApi
        .map((w) => ({ id: w.id, date: w.date, weightKg: w.weightKg }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }
  }
  return next
}

function weightHistoryFingerprint(h: { date: string; weightKg: number }[]): string {
  return [...h]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => `${e.date}:${Math.round(e.weightKg * 100) / 100}`)
    .join("|")
}

function computeWeightMergeNotice(
  localHist: WeightHistoryEntry[],
  apiHist: WeightEntryRead[],
): string | null {
  if (apiHist.length === 0 || localHist.length === 0) return null
  const apiAs = apiHist.map((w) => ({ date: w.date, weightKg: w.weightKg }))
  if (weightHistoryFingerprint(localHist) === weightHistoryFingerprint(apiAs)) return null
  return "سجل الوزن المحلي يختلف عن الخادم — تم اعتماد بيانات الخادم."
}

function tailWeightKgFromHistory(h: WeightHistoryEntry[]): number | null {
  if (h.length === 0) return null
  const sorted = [...h].sort((a, b) => a.date.localeCompare(b.date))
  const last = sorted[sorted.length - 1]
  return last != null && Number.isFinite(last.weightKg) ? last.weightKg : null
}

export type ServerSyncStatus = "idle" | "syncing" | "synced" | "error"

function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProfile
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    return {
      heightM: typeof parsed.heightM === "number" ? parsed.heightM : null,
      weightKg: typeof parsed.weightKg === "number" ? parsed.weightKg : null,
      dailyCaloriesTarget:
        typeof parsed.dailyCaloriesTarget === "number" ? parsed.dailyCaloriesTarget : null,
      weightGoalKg: typeof parsed.weightGoalKg === "number" ? parsed.weightGoalKg : null,
      birthday: typeof parsed.birthday === "string" ? parseProfileBirthday(parsed.birthday) : null,
      gender: parseGender(parsed.gender),
      weightHistory: Array.isArray(parsed.weightHistory) ? parsed.weightHistory : [],
    }
  } catch {
    return defaultProfile
  }
}

export function computeBmi(weightKg: number | null, heightM: number | null): number | null {
  if (weightKg == null || heightM == null || heightM <= 0) return null
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

type ProfileContextType = {
  profile: UserProfile
  /** Last error from GET /api/me/profile (validation, auth, network). */
  profileLoadError: string | null
  serverSyncStatus: ServerSyncStatus
  /** Shown after login/refresh when local weight history differed from server before merge. */
  profileMergeNotice: string | null
  dismissProfileMergeNotice: () => void
  setProfile: (next: UserProfile) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  /** Records weight for `date` (default today). Syncs `weightKg` to latest. POSTs when online. */
  recordWeightKg: (weightKg: number, date?: string) => Promise<void>
  getLatestWeightKg: () => number | null
  patchWeightEntry: (
    id: string,
    patch: { weightKg?: number; date?: string },
  ) => Promise<void>
  removeWeightEntry: (id: string) => Promise<void>
  /** GET /api/me/profile — merges into local profile when online. */
  refreshProfileFromServer: () => Promise<void>
  /** Apply a server snapshot (e.g. after PUT) without clearing weight history. */
  applyServerProfileRead: (server: ProfileRead) => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { apiMode, user } = useAuth()
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [serverSyncStatus, setServerSyncStatus] = useState<ServerSyncStatus>("idle")
  const [profileMergeNotice, setProfileMergeNotice] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProfileState(loadProfile())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!apiMode) {
      setServerSyncStatus("idle")
      setProfileMergeNotice(null)
    }
  }, [apiMode])

  useEffect(() => {
    if (!ready || !apiMode || !user) {
      setProfileLoadError(null)
      if (!apiMode || !user) setServerSyncStatus("idle")
      return
    }
    let cancelled = false
    setProfileLoadError(null)
    setServerSyncStatus("syncing")
    Promise.all([apiGetProfile(), apiListWeightEntries()])
      .then(([server, weights]) => {
        if (!cancelled) {
          setProfileLoadError(null)
          let notice: string | null = null
          setProfileState((prev) => {
            notice = computeWeightMergeNotice(prev.weightHistory, weights)
            return applyProfileAndOptionalWeightHistory(prev, server, weights)
          })
          setProfileMergeNotice(notice)
          setServerSyncStatus("synced")
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setProfileLoadError(
            e instanceof Error ? e.message : "فشل تحميل الملف الشخصي من الخادم",
          )
          setServerSyncStatus("error")
        }
      })
    return () => {
      cancelled = true
    }
  }, [ready, apiMode, user?.id])

  /** Same browser, another tab wrote profile to localStorage — reload. */
  useEffect(() => {
    if (!ready) return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setProfileState(loadProfile())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [ready])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile, ready])

  const setProfile = useCallback((next: UserProfile) => {
    setProfileState(next)
  }, [])

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((prev) => ({ ...prev, ...patch }))
  }, [])

  const refreshProfileFromServer = useCallback(async () => {
    if (!apiMode || !user) return
    setProfileLoadError(null)
    setServerSyncStatus("syncing")
    try {
      const [server, weights] = await Promise.all([apiGetProfile(), apiListWeightEntries()])
      setProfileLoadError(null)
      let notice: string | null = null
      setProfileState((prev) => {
        notice = computeWeightMergeNotice(prev.weightHistory, weights)
        return applyProfileAndOptionalWeightHistory(prev, server, weights)
      })
      setProfileMergeNotice(notice)
      setServerSyncStatus("synced")
    } catch (e: unknown) {
      setProfileLoadError(e instanceof Error ? e.message : "فشل تحميل الملف الشخصي من الخادم")
      setServerSyncStatus("error")
    }
  }, [apiMode, user])

  const dismissProfileMergeNotice = useCallback(() => {
    setProfileMergeNotice(null)
  }, [])

  /** Refetch when tab/window regains attention (another device may have updated the profile). */
  useEffect(() => {
    if (!ready || !apiMode || !user) return
    let debounce: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => {
        debounce = null
        void refreshProfileFromServer()
      }, 300)
    }
    document.addEventListener("visibilitychange", schedule)
    window.addEventListener("focus", schedule)
    return () => {
      document.removeEventListener("visibilitychange", schedule)
      window.removeEventListener("focus", schedule)
      if (debounce) clearTimeout(debounce)
    }
  }, [ready, apiMode, user?.id, refreshProfileFromServer])

  const applyServerProfileRead = useCallback((server: ProfileRead) => {
    setProfileState((prev) => mergeUserProfileFromServer(prev, server))
  }, [])

  const getLatestWeightKg = useCallback((): number | null => {
    // Prefer profile.weightKg (synced from API / settings) so another device’s update
    // is not overridden by an older tail of local weightHistory.
    if (profile.weightKg != null && Number.isFinite(profile.weightKg)) return profile.weightKg
    const h = [...profile.weightHistory].sort((a, b) => a.date.localeCompare(b.date))
    if (h.length === 0) return null
    return h[h.length - 1]?.weightKg ?? null
  }, [profile.weightHistory, profile.weightKg])

  const recordWeightKg = useCallback(
    async (weightKg: number, date?: string) => {
      const d = date ?? todayLocalYMD()
      if (apiMode && user) {
        const saved = await apiPostWeightEntry({ date: d, weightKg })
        const entry: WeightHistoryEntry = {
          id: saved.id,
          date: saved.date,
          weightKg: saved.weightKg,
        }
        setProfileState((prev) => {
          const withoutSameDay = prev.weightHistory.filter((e) => e.date !== d)
          const nextHistory = [...withoutSameDay, entry].sort((a, b) =>
            a.date.localeCompare(b.date),
          )
          return {
            ...prev,
            weightKg,
            weightHistory: nextHistory,
          }
        })
        return
      }
      const entry: WeightHistoryEntry = {
        id: crypto.randomUUID(),
        date: d,
        weightKg,
      }
      setProfileState((prev) => {
        const withoutSameDay = prev.weightHistory.filter((e) => e.date !== d)
        const nextHistory = [...withoutSameDay, entry].sort((a, b) =>
          a.date.localeCompare(b.date),
        )
        return {
          ...prev,
          weightKg,
          weightHistory: nextHistory,
        }
      })
    },
    [apiMode, user],
  )

  const patchWeightEntry = useCallback(
    async (id: string, patch: { weightKg?: number; date?: string }) => {
      if (apiMode && user) {
        const updated = await apiPatchWeightEntry(id, patch)
        setProfileState((prev) => {
          const nextHist = prev.weightHistory
            .map((e) =>
              e.id === id ? { id: updated.id, date: updated.date, weightKg: updated.weightKg } : e,
            )
            .sort((a, b) => a.date.localeCompare(b.date))
          return {
            ...prev,
            weightHistory: nextHist,
            weightKg: tailWeightKgFromHistory(nextHist) ?? prev.weightKg,
          }
        })
        return
      }
      setProfileState((prev) => {
        const nextHist = prev.weightHistory
          .map((e) =>
            e.id === id
              ? {
                  ...e,
                  date: patch.date ?? e.date,
                  weightKg: patch.weightKg ?? e.weightKg,
                }
              : e,
          )
          .sort((a, b) => a.date.localeCompare(b.date))
        return {
          ...prev,
          weightHistory: nextHist,
          weightKg: tailWeightKgFromHistory(nextHist) ?? prev.weightKg,
        }
      })
    },
    [apiMode, user],
  )

  const removeWeightEntry = useCallback(
    async (id: string) => {
      if (apiMode && user) {
        await apiDeleteWeightEntry(id)
        setProfileState((prev) => {
          const nextHist = prev.weightHistory.filter((e) => e.id !== id)
          return {
            ...prev,
            weightHistory: nextHist,
            weightKg: tailWeightKgFromHistory(nextHist),
          }
        })
        return
      }
      setProfileState((prev) => {
        const nextHist = prev.weightHistory.filter((e) => e.id !== id)
        return {
          ...prev,
          weightHistory: nextHist,
          weightKg: tailWeightKgFromHistory(nextHist),
        }
      })
    },
    [apiMode, user],
  )

  const value = useMemo(
    () => ({
      profile,
      profileLoadError,
      serverSyncStatus,
      profileMergeNotice,
      dismissProfileMergeNotice,
      setProfile,
      updateProfile,
      recordWeightKg,
      getLatestWeightKg,
      patchWeightEntry,
      removeWeightEntry,
      refreshProfileFromServer,
      applyServerProfileRead,
    }),
    [
      profile,
      profileLoadError,
      serverSyncStatus,
      profileMergeNotice,
      dismissProfileMergeNotice,
      setProfile,
      updateProfile,
      recordWeightKg,
      getLatestWeightKg,
      patchWeightEntry,
      removeWeightEntry,
      refreshProfileFromServer,
      applyServerProfileRead,
    ]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (ctx === undefined) throw new Error("useProfile must be used within ProfileProvider")
  return ctx
}

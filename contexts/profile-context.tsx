"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { apiGetProfile, type ProfileRead } from "@/lib/api"
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

function mergeFromServer(local: UserProfile, server: ProfileRead): UserProfile {
  const g = server.gender === "male" || server.gender === "female" ? server.gender : null
  const b =
    typeof server.birthday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(server.birthday)
      ? server.birthday
      : null
  return {
    ...local,
    heightM: server.heightM ?? null,
    weightKg: server.weightKg ?? null,
    dailyCaloriesTarget: server.dailyCaloriesTarget ?? null,
    weightGoalKg: server.weightGoalKg ?? null,
    birthday: b,
    gender: g,
  }
}

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
  setProfile: (next: UserProfile) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  /** Records weight for `date` (default today). Syncs `weightKg` to latest. */
  recordWeightKg: (weightKg: number, date?: string) => void
  getLatestWeightKg: () => number | null
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { apiMode, user } = useAuth()
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProfileState(loadProfile())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || !apiMode || !user) return
    let cancelled = false
    apiGetProfile()
      .then((server) => {
        if (!cancelled) {
          setProfileState((prev) => mergeFromServer(prev, server))
        }
      })
      .catch(() => {
        /* keep local profile */
      })
    return () => {
      cancelled = true
    }
  }, [ready, apiMode, user?.id])

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

  const getLatestWeightKg = useCallback((): number | null => {
    const h = [...profile.weightHistory].sort((a, b) => a.date.localeCompare(b.date))
    if (h.length === 0) return profile.weightKg
    return h[h.length - 1]?.weightKg ?? profile.weightKg
  }, [profile.weightHistory, profile.weightKg])

  const recordWeightKg = useCallback((weightKg: number, date?: string) => {
    const d = date ?? todayLocalYMD()
    const entry: WeightHistoryEntry = {
      id: crypto.randomUUID(),
      date: d,
      weightKg,
    }
    setProfileState((prev) => {
      const withoutSameDay = prev.weightHistory.filter((e) => e.date !== d)
      const nextHistory = [...withoutSameDay, entry].sort((a, b) => a.date.localeCompare(b.date))
      return {
        ...prev,
        weightKg,
        weightHistory: nextHistory,
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      updateProfile,
      recordWeightKg,
      getLatestWeightKg,
    }),
    [profile, setProfile, updateProfile, recordWeightKg, getLatestWeightKg]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (ctx === undefined) throw new Error("useProfile must be used within ProfileProvider")
  return ctx
}

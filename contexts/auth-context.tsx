"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { AUTH_USER_STORAGE_KEY } from "@/lib/auth-constants"
import { apiLogin, defaultSessionExpiresAtIso, getApiConfig, hydrateApiConfig } from "@/lib/api"

const USER_KEY = AUTH_USER_STORAGE_KEY

const SESSION_CHECK_MS = 60_000

export type AuthUser = {
  id: string
  email: string
  name: string
  username: string
  /** ISO time after which the client signs the user out (server hint from login). */
  sessionExpiresAt: string
}

export type LoginResult = { ok: true } | { ok: false; message: string }

function isSessionExpired(iso: string): boolean {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return true
  return Date.now() > t
}

type AuthContextType = {
  user: AuthUser | null
  /** True when API URL + token are available (build-time or runtime-env.json). */
  apiMode: boolean
  isLoading: boolean
  /** Human-readable session end for settings (Arabic locale). */
  sessionExpiresLabel: string | null
  login: (identifier: string, password: string) => Promise<LoginResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function loadUserFromStorage(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    const u = JSON.parse(raw) as Partial<AuthUser>
    if (typeof u.email !== "string" || typeof u.name !== "string") return null
    const id = typeof u.id === "string" && u.id ? u.id : ""
    if (!id || id === "demo") return null
    const sessionExpiresAt =
      typeof u.sessionExpiresAt === "string" && u.sessionExpiresAt.trim() !== ""
        ? u.sessionExpiresAt
        : defaultSessionExpiresAtIso()
    if (isSessionExpired(sessionExpiresAt)) {
      localStorage.removeItem(USER_KEY)
      return null
    }
    const next: AuthUser = {
      id,
      email: u.email,
      name: u.name,
      username:
        typeof u.username === "string" && u.username ? u.username : u.email.split("@")[0] ?? "user",
      sessionExpiresAt,
    }
    if (!u.sessionExpiresAt) {
      localStorage.setItem(USER_KEY, JSON.stringify(next))
    }
    return next
  } catch {
    localStorage.removeItem(USER_KEY)
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [apiMode, setApiMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await hydrateApiConfig()
      if (cancelled) return
      const configured = getApiConfig().configured
      setApiMode(configured)
      const u = loadUserFromStorage()
      if (configured) {
        if (u) setUser(u)
      } else {
        localStorage.removeItem(USER_KEY)
        setUser(null)
      }
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
  }, [])

  useEffect(() => {
    if (!user) return
    const check = () => {
      if (isSessionExpired(user.sessionExpiresAt)) {
        logout()
      }
    }
    check()
    const id = setInterval(check, SESSION_CHECK_MS)
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") check()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [user, logout])

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      await hydrateApiConfig()
      const ident = identifier.trim()
      if (!ident || !password) {
        return { ok: false, message: "أدخل اسم المستخدم أو البريد وكلمة المرور" }
      }
      if (!getApiConfig().configured) {
        return {
          ok: false,
          message:
            "لم يُحمّل عنوان  أو الرمز. في Railway تأكد من NEXT_PUBLIC_API_URL و NEXT_PUBLIC_API_KEY (نفس APP_TOKEN في ) ثم أعد نشر الواجهة.",
        }
      }
      try {
        const data = await apiLogin(ident, password)
        const sessionExpiresAt = data.sessionExpiresAt ?? defaultSessionExpiresAtIso()
        const nextUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.display_name,
          username: data.user.username,
          sessionExpiresAt,
        }
        setUser(nextUser)
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
        return { ok: true }
      } catch (e) {
        const message = e instanceof Error ? e.message : "تعذر الاتصال ب"
        return { ok: false, message }
      }
    },
    [],
  )

  const sessionExpiresLabel = useMemo(() => {
    if (!user) return null
    try {
      return new Intl.DateTimeFormat("ar", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(user.sessionExpiresAt))
    } catch {
      return null
    }
  }, [user])

  const value = useMemo(
    () => ({
      user,
      apiMode,
      isLoading,
      sessionExpiresLabel,
      login,
      logout,
    }),
    [user, apiMode, isLoading, sessionExpiresLabel, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

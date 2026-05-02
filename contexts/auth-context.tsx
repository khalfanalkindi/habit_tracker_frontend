"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiLogin, getApiConfig } from "@/lib/api"

const USER_KEY = "habit-tracker-user"

export type AuthUser = {
  id: string
  email: string
  name: string
  username: string
}

export type LoginResult = { ok: true } | { ok: false; message: string }

type AuthContextType = {
  user: AuthUser | null
  /** True when NEXT_PUBLIC_API_URL + NEXT_PUBLIC_APP_TOKEN are set (read on client after mount). */
  apiMode: boolean
  isLoading: boolean
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
    const id = typeof u.id === "string" && u.id ? u.id : "demo"
    return {
      id,
      email: u.email,
      name: u.name,
      username: typeof u.username === "string" && u.username ? u.username : u.email.split("@")[0] ?? "user",
    }
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
    const configured = getApiConfig().configured
    setApiMode(configured)
    const u = loadUserFromStorage()
    if (configured) {
      if (u && u.id !== "demo") {
        setUser(u)
      } else if (u) {
        localStorage.removeItem(USER_KEY)
      }
    } else if (u) {
      setUser(u)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      const ident = identifier.trim()
      if (!ident || !password) {
        return { ok: false, message: "أدخل اسم المستخدم أو البريد وكلمة المرور" }
      }
      if (apiMode) {
        try {
          const data = await apiLogin(ident, password)
          const nextUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.display_name,
            username: data.user.username,
          }
          setUser(nextUser)
          localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
          return { ok: true }
        } catch (e) {
          const message = e instanceof Error ? e.message : "تعذر الاتصال بالخادم"
          return { ok: false, message }
        }
      }
      const nextUser: AuthUser = {
        id: "demo",
        email: ident,
        name: ident.split("@")[0] || "مستخدم",
        username: ident.split("@")[0] || "user",
      }
      setUser(nextUser)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      return { ok: true }
    },
    [apiMode]
  )

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, apiMode, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

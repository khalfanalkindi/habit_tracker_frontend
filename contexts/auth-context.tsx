"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"
import { apiLogin, getApiConfig, setStoredAccessToken, getStoredAccessToken } from "@/lib/api"

const USER_KEY = "habit-tracker-user"

export type AuthUser = {
  id: string
  email: string
  name: string
  username: string
}

type AuthContextType = {
  user: AuthUser | null
  accessToken: string | null
  /** True when NEXT_PUBLIC_API_URL + NEXT_PUBLIC_API_KEY are set */
  apiMode: boolean
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<boolean>
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
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const apiMode = useMemo(() => getApiConfig().configured, [])

  useEffect(() => {
    const t = getStoredAccessToken()
    const u = loadUserFromStorage()
    if (apiMode) {
      if (t && u && u.id !== "demo") {
        setAccessToken(t)
        setUser(u)
      } else {
        setStoredAccessToken(null)
        if (u) localStorage.removeItem(USER_KEY)
      }
    } else if (u) {
      setUser(u)
    }
    setIsLoading(false)
  }, [apiMode])

  const login = useCallback(
    async (identifier: string, password: string): Promise<boolean> => {
      if (!identifier.trim() || !password) return false
      if (apiMode) {
        try {
          const data = await apiLogin(identifier.trim(), password)
          const nextUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.display_name,
            username: data.user.username,
          }
          setAccessToken(data.access_token)
          setStoredAccessToken(data.access_token)
          setUser(nextUser)
          localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
          return true
        } catch {
          return false
        }
      }
      const nextUser: AuthUser = {
        id: "demo",
        email: identifier.trim(),
        name: identifier.trim().split("@")[0] || "مستخدم",
        username: identifier.trim().split("@")[0] || "user",
      }
      setUser(nextUser)
      setAccessToken(null)
      setStoredAccessToken(null)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      return true
    },
    [apiMode]
  )

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setStoredAccessToken(null)
    localStorage.removeItem(USER_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, accessToken, apiMode, isLoading, login, logout }}
    >
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

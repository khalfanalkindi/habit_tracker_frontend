"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/login-form"
import { Dashboard } from "@/components/dashboard"
import { HabitsPage } from "@/components/habits-page"
import { SettingsPage } from "@/components/settings-page"
import { BottomNav } from "@/components/bottom-nav"

type Tab = "dashboard" | "habits" | "settings"

export function AppShell() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="min-h-dvh bg-background pb-[calc(env(safe-area-inset-bottom,0px)+9.5rem)]">
      <main className="relative z-0 max-w-lg mx-auto">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "habits" && <HabitsPage />}
        {activeTab === "settings" && <SettingsPage />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

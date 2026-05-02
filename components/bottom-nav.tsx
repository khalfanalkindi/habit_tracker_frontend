"use client"

import { UtensilsCrossed, LayoutDashboard, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "dashboard" | "habits" | "settings"

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 safe-area-pb z-50">
      <div className="max-w-lg mx-auto px-4 pb-4">
        <div className="bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-lg">
          <div className="flex items-center justify-around h-16 relative">
            {/* Habits Tab - Left */}
            <button
              onClick={() => onTabChange("habits")}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300",
                activeTab === "habits"
                  ? "text-emerald-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="العادات"
              aria-current={activeTab === "habits" ? "page" : undefined}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                activeTab === "habits" ? "bg-emerald-500/15" : ""
              )}>
                <UtensilsCrossed className="w-6 h-6" />
              </div>
            </button>

            {/* Dashboard Tab - Center Circle */}
            <button
              onClick={() => onTabChange("dashboard")}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 -top-6 flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-lg",
                activeTab === "dashboard"
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-card text-muted-foreground hover:text-foreground border-2 border-border"
              )}
              aria-label="لوحة التحكم"
              aria-current={activeTab === "dashboard" ? "page" : undefined}
            >
              <LayoutDashboard className="w-7 h-7" />
            </button>

            {/* Settings Tab - Right */}
            <button
              onClick={() => onTabChange("settings")}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300",
                activeTab === "settings"
                  ? "text-amber-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="الإعدادات"
              aria-current={activeTab === "settings" ? "page" : undefined}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                activeTab === "settings" ? "bg-amber-500/15" : ""
              )}>
                <Settings className="w-6 h-6" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

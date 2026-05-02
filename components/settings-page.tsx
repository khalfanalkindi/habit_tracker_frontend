"use client"

import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LogOut, Moon, Sun, User, Smartphone, Ruler, Scale, Target, Flame } from "lucide-react"
import { useEffect, useState } from "react"

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { profile, updateProfile, recordWeightKg } = useProfile()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [heightM, setHeightM] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [dailyCalories, setDailyCalories] = useState("")
  const [weightGoal, setWeightGoal] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setHeightM(profile.heightM != null ? String(profile.heightM) : "")
    setWeightKg(profile.weightKg != null ? String(profile.weightKg) : "")
    setDailyCalories(
      profile.dailyCaloriesTarget != null ? String(profile.dailyCaloriesTarget) : ""
    )
    setWeightGoal(profile.weightGoalKg != null ? String(profile.weightGoalKg) : "")
  }, [profile])

  const isDark = mounted && theme === "dark"

  const handleSaveBodyStats = () => {
    const hm = parseFloat(heightM.replace(",", "."))
    const wk = parseFloat(weightKg.replace(",", "."))
    const dc = parseInt(dailyCalories.replace(/\s/g, ""), 10)
    const wg = parseFloat(weightGoal.replace(",", "."))

    updateProfile({
      heightM: Number.isFinite(hm) && hm > 0 ? hm : null,
      weightKg: Number.isFinite(wk) && wk > 0 ? wk : null,
      dailyCaloriesTarget: Number.isFinite(dc) && dc > 0 ? dc : null,
      weightGoalKg: Number.isFinite(wg) && wg > 0 ? wg : null,
    })
    if (Number.isFinite(wk) && wk > 0) {
      recordWeightKg(wk)
    }
  }

  return (
    <div className="p-4 pb-28 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground text-sm">إدارة تفضيلاتك</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            الملف الشخصي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
              {user?.name?.charAt(0).toUpperCase() || "م"}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{user?.name || "مستخدم"}</p>
              <p className="text-sm text-muted-foreground">{user?.email || "user@example.com"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body & goals — stored locally until backend sync */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            الجسم والأهداف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            تُستخدم هذه القيم في لوحة التحكم (مؤشر كتلة الجسم، تنبيه السعرات). تُحفظ على جهازك فقط حالياً.
          </p>
          <div className="grid gap-3">
            <Field>
              <FieldLabel className="text-foreground flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5" />
                الطول (م)
              </FieldLabel>
              <Input
                inputMode="decimal"
                placeholder="مثال: 1.75"
                value={heightM}
                onChange={(e) => setHeightM(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className="text-foreground flex items-center gap-2">
                <Scale className="w-3.5 h-3.5" />
                الوزن الحالي (كغ)
              </FieldLabel>
              <Input
                inputMode="decimal"
                placeholder="مثال: 78"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className="text-foreground flex items-center gap-2">
                <Flame className="w-3.5 h-3.5" />
                هدف السعرات اليومية
              </FieldLabel>
              <Input
                inputMode="numeric"
                placeholder="مثال: 2000"
                value={dailyCalories}
                onChange={(e) => setDailyCalories(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className="text-foreground flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                هدف الوزن (كغ)
              </FieldLabel>
              <Input
                inputMode="decimal"
                placeholder="اختياري — مثال: 72"
                value={weightGoal}
                onChange={(e) => setWeightGoal(e.target.value)}
              />
            </Field>
          </div>
          <Button className="w-full" onClick={handleSaveBodyStats}>
            حفظ الجسم والأهداف
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            المظهر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Field className="flex-1">
              <FieldLabel className="text-foreground">الوضع الليلي</FieldLabel>
              <p className="text-xs text-muted-foreground">
                التبديل بين الوضع الفاتح والداكن
              </p>
            </Field>
            {mounted && (
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            معلومات التطبيق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الإصدار</span>
            <span className="text-foreground">1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">النوع</span>
            <span className="text-foreground">تطبيق ويب تقدمي</span>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 ml-2" />
        تسجيل الخروج
      </Button>
    </div>
  )
}

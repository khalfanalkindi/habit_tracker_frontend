"use client"

import { useAuth } from "@/contexts/auth-context"
import { apiChangePassword, apiPutProfile, profileToApiBody } from "@/lib/api"
import { parseProfileBirthday, useProfile, type ProfileGender } from "@/contexts/profile-context"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LogOut,
  Moon,
  Sun,
  User,
  Smartphone,
  Ruler,
  Scale,
  Target,
  Flame,
  Calendar,
  VenusAndMars,
  KeyRound,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export function SettingsPage() {
  const { user, logout, apiMode, sessionExpiresLabel } = useAuth()
  const { profile, profileLoadError, updateProfile, recordWeightKg, applyServerProfileRead } =
    useProfile()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [heightM, setHeightM] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [dailyCalories, setDailyCalories] = useState("")
  const [weightGoal, setWeightGoal] = useState("")
  /** "" = unset; maps to profile.gender null */
  const [genderUi, setGenderUi] = useState<"" | ProfileGender>("")
  const [birthdayUi, setBirthdayUi] = useState("")
  const [profileSyncError, setProfileSyncError] = useState("")
  const [profileSaveOk, setProfileSaveOk] = useState(false)
  const saveOkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [pwOld, setPwOld] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    return () => {
      if (saveOkTimer.current) clearTimeout(saveOkTimer.current)
    }
  }, [])

  useEffect(() => {
    setHeightM(profile.heightM != null ? String(profile.heightM) : "")
    setWeightKg(profile.weightKg != null ? String(profile.weightKg) : "")
    setDailyCalories(
      profile.dailyCaloriesTarget != null ? String(profile.dailyCaloriesTarget) : ""
    )
    setWeightGoal(profile.weightGoalKg != null ? String(profile.weightGoalKg) : "")
    setGenderUi(profile.gender ?? "")
    setBirthdayUi(profile.birthday ?? "")
  }, [profile])

  const isDark = mounted && theme === "dark"

  const handleSaveBodyStats = async () => {
    setProfileSyncError("")
    if (saveOkTimer.current) {
      clearTimeout(saveOkTimer.current)
      saveOkTimer.current = null
    }
    setProfileSaveOk(false)
    const hm = parseFloat(heightM.replace(",", "."))
    const wk = parseFloat(weightKg.replace(",", "."))
    const dc = parseInt(dailyCalories.replace(/\s/g, ""), 10)
    const wg = parseFloat(weightGoal.replace(",", "."))

    const birthday = birthdayUi.trim() === "" ? null : parseProfileBirthday(birthdayUi)
    const gender = genderUi === "" ? null : genderUi

    const heightVal = Number.isFinite(hm) && hm > 0 ? hm : null
    const weightVal = Number.isFinite(wk) && wk > 0 ? wk : null
    const dcVal = Number.isFinite(dc) && dc > 0 ? dc : null
    const wgVal = Number.isFinite(wg) && wg > 0 ? wg : null

    updateProfile({
      heightM: heightVal,
      weightKg: weightVal,
      dailyCaloriesTarget: dcVal,
      weightGoalKg: wgVal,
      birthday,
      gender,
    })
    if (apiMode) {
      try {
        if (Number.isFinite(wk) && wk > 0) {
          await recordWeightKg(wk)
        }
        const body = profileToApiBody({
          heightM: heightVal,
          weightKg: weightVal,
          dailyCaloriesTarget: dcVal,
          weightGoalKg: wgVal,
          birthday,
          gender,
        })
        const saved = await apiPutProfile(body)
        applyServerProfileRead(saved)
        toast.success("تم حفظ الملف الشخصي بنجاح")
        setProfileSaveOk(true)
        saveOkTimer.current = setTimeout(() => {
          setProfileSaveOk(false)
          saveOkTimer.current = null
        }, 5000)
      } catch (e: unknown) {
        setProfileSyncError(
          e instanceof Error ? e.message : "تعذر حفظ الملف على الخادم. تحقق من الاتصال.",
        )
      }
    } else {
      if (Number.isFinite(wk) && wk > 0) {
        await recordWeightKg(wk)
      }
      toast.success("تم حفظ الإعدادات على جهازك")
      setProfileSaveOk(true)
      saveOkTimer.current = setTimeout(() => {
        setProfileSaveOk(false)
        saveOkTimer.current = null
      }, 5000)
    }
  }

  const handleChangePassword = async () => {
    if (!user) return
    if (pwNew.length < 8) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل")
      return
    }
    if (pwNew !== pwConfirm) {
      toast.error("تأكيد كلمة المرور غير مطابق")
      return
    }
    setPwBusy(true)
    try {
      const identifier = user.email || user.username
      await apiChangePassword({
        identifier,
        oldPassword: pwOld,
        newPassword: pwNew,
      })
      toast.success("تم تغيير كلمة المرور")
      setPwOld("")
      setPwNew("")
      setPwConfirm("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تغيير كلمة المرور")
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="p-4 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        {profileSaveOk ? (
          <p
            className="text-sm mt-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 px-3 py-2"
            dir="auto"
            role="status"
          >
            تم تحديث الملف الشخصي بنجاح.
          </p>
        ) : null}
        {profileLoadError && (
          <p className="text-sm text-destructive mt-2" dir="auto">
            {profileLoadError}
          </p>
        )}
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
            تُستخدم الطول والوزن والأهداف في لوحة التحكم (مؤشر كتلة الجسم، تنبيه السعرات). تاريخ الميلاد والجنس
            للملف فقط ولا يظهران في لوحة التحكم.
            {apiMode
              ? " تُحفظ محلياً وتُزامن مع الخادم عند الضغط على حفظ."
              : " تُحفظ على جهازك فقط حالياً."}
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
            <Field>
              <FieldLabel className="text-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                تاريخ الميلاد (اختياري)
              </FieldLabel>
              <Input
                type="date"
                value={birthdayUi}
                onChange={(e) => setBirthdayUi(e.target.value)}
                className="text-left"
                dir="ltr"
              />
            </Field>
            <Field>
              <FieldLabel className="text-foreground flex items-center gap-2">
                <VenusAndMars className="w-3.5 h-3.5" />
                الجنس (اختياري)
              </FieldLabel>
              <Select
                value={genderUi === "" ? "__none__" : genderUi}
                onValueChange={(v) =>
                  setGenderUi(v === "__none__" ? "" : (v as ProfileGender))
                }
              >
                <SelectTrigger className="w-full max-w-full justify-between" size="default">
                  <SelectValue placeholder="لم يُحدد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">لم يُحدد</SelectItem>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {profileSyncError ? (
            <p className="text-sm text-destructive text-center" dir="auto">
              {profileSyncError}
            </p>
          ) : null}
          <Button className="w-full" onClick={() => void handleSaveBodyStats()}>
            حفظ الجسم والأهداف
          </Button>
        </CardContent>
      </Card>

      {apiMode && user ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              الأمان وكلمة المرور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionExpiresLabel ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                تنتهي جلسة هذا الجهاز تقريباً في:{" "}
                <span className="font-medium text-foreground" dir="auto">
                  {sessionExpiresLabel}
                </span>
                . بعدها سُطلب منك تسجيل الدخول مجدداً.
              </p>
            ) : null}
            <div className="grid gap-3">
              <Field>
                <FieldLabel>كلمة المرور الحالية</FieldLabel>
                <Input
                  type="password"
                  value={pwOld}
                  onChange={(e) => setPwOld(e.target.value)}
                  autoComplete="current-password"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <Field>
                <FieldLabel>كلمة المرور الجديدة</FieldLabel>
                <Input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <Field>
                <FieldLabel>تأكيد الجديدة</FieldLabel>
                <Input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={pwBusy}
              onClick={() => void handleChangePassword()}
            >
              {pwBusy ? "جاري الحفظ…" : "تحديث كلمة المرور"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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

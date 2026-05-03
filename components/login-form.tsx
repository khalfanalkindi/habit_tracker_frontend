"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useAuth } from "@/contexts/auth-context"
import { apiForgotPassword } from "@/lib/api"
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

type Mode = "login" | "forgot"

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (mode === "forgot") {
      const ident = email.trim()
      if (!ident) {
        setError("أدخل البريد أو اسم المستخدم")
        return
      }
      setIsLoading(true)
      try {
        const res = await apiForgotPassword(ident)
        toast.message(res.message || "تم الطلب", {
          description: res.resetLink
            ? `رابط إعادة التعيين (وضع التطوير): ${res.resetLink}`
            : "إذا وُجد حساب وكان البريد مُعدّاً على الخادم، ستصلك رسالة بخطوات إعادة التعيين.",
        })
        setMode("login")
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذر إرسال الطلب")
      } finally {
        setIsLoading(false)
      }
      return
    }

    setIsLoading(true)
    const result = await login(email, password)
    setIsLoading(false)
    if (!result.ok) {
      setError(result.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? "متتبع العادات" : "استعادة كلمة المرور"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "ابني عادات أفضل، يوماً بعد يوم"
              : "أدخل البريد أو اسم المستخدم كما في تسجيل الدخول. إن وُجد حساب وكان البريد مُفعّلاً على الخادم ستصلك تعليمات عبر البريد."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">
                  {mode === "login"
                    ? "البريد أو اسم المستخدم أو الاسم الظاهر"
                    : "البريد أو اسم المستخدم"}
                </FieldLabel>
                <Input
                  id="email"
                  type="text"
                  placeholder="you@example.com أو اسم المستخدم"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="text-right"
                  dir="ltr"
                />
              </Field>
              {mode === "login" ? (
                <Field>
                  <FieldLabel htmlFor="password">كلمة المرور</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    dir="ltr"
                    className="text-right"
                  />
                </Field>
              ) : null}
            </FieldGroup>

            {error && (
              <p className="text-sm text-destructive text-center" dir="auto">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "جاري تسجيل الدخول..." : "جاري الإرسال..."}
                </>
              ) : mode === "login" ? (
                "تسجيل الدخول"
              ) : (
                "إرسال رابط الاستعادة"
              )}
            </Button>

            {mode === "login" ? (
              <div className="flex flex-col gap-2 text-sm text-center">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setError("")
                    setMode("forgot")
                  }}
                >
                  نسيت كلمة المرور؟
                </button>
                <p className="text-muted-foreground text-xs">
                  لديك رابط من البريد؟{" "}
                  <Link href="/reset-password" className="text-primary underline inline-flex items-center gap-0.5">
                    تعيين كلمة جديدة
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                  </Link>
                </p>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setError("")
                  setMode("login")
                }}
              >
                العودة لتسجيل الدخول
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

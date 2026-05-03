"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { apiResetPassword } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

function ResetPasswordForm() {
  const params = useSearchParams()
  const tokenFromUrl = params.get("token") ?? ""
  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      return
    }
    if (password !== confirm) {
      toast.error("تأكيد كلمة المرور غير مطابق")
      return
    }
    if (!token.trim()) {
      toast.error("الرابط غير صالح — انسخ الرمز من البريد أو الصق الرابط كاملاً")
      return
    }
    setLoading(true)
    try {
      await apiResetPassword(token.trim(), password)
      toast.success("تم تعيين كلمة المرور. يمكنك تسجيل الدخول الآن.")
      setPassword("")
      setConfirm("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إعادة التعيين")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">كلمة مرور جديدة</CardTitle>
          <CardDescription>
            الصق الرمز من رابط البريد أو من الرابط الذي فتحته، ثم اختر كلمة مرور قوية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>رمز إعادة التعيين</FieldLabel>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="الرمز من الرابط (?token=...)"
                  dir="ltr"
                  className="text-left font-mono text-sm"
                  autoComplete="off"
                />
              </Field>
              <Field>
                <FieldLabel>كلمة المرور الجديدة</FieldLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <Field>
                <FieldLabel>تأكيد كلمة المرور</FieldLabel>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
            </FieldGroup>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ…
                </>
              ) : (
                "حفظ كلمة المرور"
              )}
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">العودة لتسجيل الدخول</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          جاري التحميل…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}

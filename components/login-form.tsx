"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, CheckCircle2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login, apiMode } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
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
          <CardTitle className="text-2xl font-bold">متتبع العادات</CardTitle>
          <CardDescription>
            ابني عادات أفضل، يوماً بعد يوم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">البريد أو اسم المستخدم أو الاسم الظاهر</FieldLabel>
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
            </FieldGroup>

            {error && (
              <p className="text-sm text-destructive text-center" dir="auto">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !apiMode}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>

            {!apiMode && (
              <p className="text-xs text-muted-foreground text-center">
                أضف في Railway متغيرات الواجهة ثم أعد بناء النشر.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

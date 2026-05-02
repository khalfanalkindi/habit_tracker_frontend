"use client"

import { useState } from "react"
import { useProfile } from "@/contexts/profile-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Scale } from "lucide-react"

export function HabitsWeightCard() {
  const { getLatestWeightKg, recordWeightKg } = useProfile()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const latest = getLatestWeightKg()

  const handleSave = () => {
    const v = parseFloat(input.replace(",", "."))
    if (!Number.isFinite(v) || v <= 0 || v > 400) return
    recordWeightKg(v)
    setInput("")
    setOpen(false)
  }

  return (
    <>
      <Card className="border-violet-500/25 bg-gradient-to-l from-violet-500/10 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4 text-violet-500" />
            وزنك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            هل تريد تحديث وزنك؟ سجّل وزنك اليومي هنا (يُحفظ على جهازك حتى نربطه بالخادم لاحقاً).
          </p>
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-muted-foreground">آخر وزن مسجّل</p>
            <p className="text-5xl font-extrabold tabular-nums text-violet-600 dark:text-violet-400">
              {latest != null ? latest.toFixed(1) : "—"}
            </p>
            <p className="text-sm text-muted-foreground">كيلوغرام</p>
          </div>
          <Button className="w-full" variant="secondary" onClick={() => setOpen(true)}>
            تحديث الوزن
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسجيل وزن جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-foreground">الوزن (كغ)</label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="مثال: 72.5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="text-lg"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

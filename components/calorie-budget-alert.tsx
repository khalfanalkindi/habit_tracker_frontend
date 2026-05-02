"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

type CalorieBudgetAlertProps = {
  consumed: number
  target: number | null
  compact?: boolean
}

export function CalorieBudgetAlert({ consumed, target, compact }: CalorieBudgetAlertProps) {
  if (target == null || target <= 0) return null
  if (consumed <= target) return null
  const over = Math.round(consumed - target)

  return (
    <Alert variant="destructive" className={compact ? "py-3" : ""}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>تجاوز هدف السعرات اليوم</AlertTitle>
      <AlertDescription className="text-sm leading-relaxed space-y-1">
        <p>
          سجّلت حوالي <strong>{Math.round(consumed)}</strong> سعرة، وهدفك <strong>{Math.round(target)}</strong>{" "}
          (زيادة حوالي <strong>{over}</strong> سعرة).
        </p>
        <ul className="list-disc list-inside text-xs opacity-95 space-y-0.5">
          <li>فضّل وجبات أخف أو أقل حجماً في الوجبة القادمة</li>
          <li>مشي قصير أو نشاط خفيف قد يساعد على التوازن</li>
          <li>راجع هدف السعرات من الإعدادات إن كان بحاجة لتعديل</li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}

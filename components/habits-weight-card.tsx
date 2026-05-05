"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useProfile } from "@/contexts/profile-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Scale, Pencil, Trash2 } from "lucide-react"
import type { WeightHistoryEntry } from "@/contexts/profile-context"

export function HabitsWeightCard() {
  const { apiMode } = useAuth()
  const {
    profile,
    getLatestWeightKg,
    recordWeightKg,
    patchWeightEntry,
    removeWeightEntry,
  } = useProfile()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)

  const [editEntry, setEditEntry] = useState<WeightHistoryEntry | null>(null)
  const [editInput, setEditInput] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  const [deleteEntry, setDeleteEntry] = useState<WeightHistoryEntry | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const latest = getLatestWeightKg()

  const sortedHistory = useMemo(() => {
    return [...profile.weightHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 21)
  }, [profile.weightHistory])

  const handleSave = async () => {
    const v = parseFloat(input.replace(",", "."))
    if (!Number.isFinite(v) || v <= 0 || v > 500) {
      toast.error("أدخل وزناً بين 0.1 و 500 كغ")
      return
    }
    setSaving(true)
    try {
      await recordWeightKg(v)
      setInput("")
      setOpen(false)
      if (apiMode) toast.success("تم حفظ الوزن")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ الوزن")
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (e: WeightHistoryEntry) => {
    setEditEntry(e)
    setEditInput(String(e.weightKg))
  }

  const handleEditSave = async () => {
    if (!editEntry) return
    const v = parseFloat(editInput.replace(",", "."))
    if (!Number.isFinite(v) || v <= 0 || v > 500) {
      toast.error("أدخل وزناً بين 0.1 و 500 كغ")
      return
    }
    setEditSaving(true)
    try {
      await patchWeightEntry(editEntry.id, { weightKg: v })
      setEditEntry(null)
      toast.success("تم تحديث السجل")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر التحديث")
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteEntry) return
    setDeleteSaving(true)
    try {
      await removeWeightEntry(deleteEntry.id)
      setDeleteEntry(null)
      toast.success("تم حذف السجل")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الحذف")
    } finally {
      setDeleteSaving(false)
    }
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
            {apiMode
              ? "سجّل وزنك اليومي هنا؛ يُحفظ على حسابك ويظهر في الملف الشخصي."
              : "سجّل وزنك اليومي هنا؛ يُحفظ على جهازك حتى تسجّل الدخول لمزامنة ."}
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

          {sortedHistory.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">آخر السجلات</p>
              <ScrollArea className="h-[min(14rem,40vh)] rounded-md border border-border/60">
                <ul className="p-2 space-y-1">
                  {sortedHistory.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1.5 text-sm"
                    >
                      <span className="tabular-nums text-muted-foreground" dir="ltr">
                        {row.date}
                      </span>
                      <span className="font-semibold tabular-nums">{row.weightKg.toFixed(1)} كغ</span>
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="تعديل"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="حذف"
                          onClick={() => setDeleteEntry(row)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : null}
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
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editEntry != null} onOpenChange={(o) => !o && setEditEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل الوزن</DialogTitle>
          </DialogHeader>
          {editEntry ? (
            <>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {editEntry.date}
              </p>
              <div className="space-y-2 py-2">
                <label className="text-sm font-medium text-foreground">الوزن (كغ)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  className="text-lg"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setEditEntry(null)}>
                  إلغاء
                </Button>
                <Button onClick={() => void handleEditSave()} disabled={editSaving}>
                  {editSaving ? "جاري الحفظ…" : "حفظ"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteEntry != null} onOpenChange={(o) => !o && setDeleteEntry(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف سجل الوزن؟</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteEntry
                ? `سيتم حذف يوم ${deleteEntry.date} (${deleteEntry.weightKg.toFixed(1)} كغ).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 flex-row-reverse sm:flex-row-reverse">
            <Button
              type="button"
              variant="destructive"
              disabled={deleteSaving}
              onClick={() => void handleDelete()}
            >
              {deleteSaving ? "…" : "حذف"}
            </Button>
            <AlertDialogCancel disabled={deleteSaving}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

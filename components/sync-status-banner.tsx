"use client"

import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/contexts/profile-context"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Loader2, WifiOff, X } from "lucide-react"

export function SyncStatusBanner() {
  const { apiMode } = useAuth()
  const {
    profileLoadError,
    serverSyncStatus,
    profileMergeNotice,
    dismissProfileMergeNotice,
  } = useProfile()

  if (!apiMode) return null

  return (
    <div className="space-y-2 px-3 pt-2">
      {profileMergeNotice ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="flex-1 leading-relaxed">{profileMergeNotice}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={dismissProfileMergeNotice}
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {serverSyncStatus === "syncing" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>جاري المزامنة …</span>
          </>
        ) : null}
        {serverSyncStatus === "synced" && !profileLoadError ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>متصل — آخر تحميل من  تم بنجاح</span>
          </>
        ) : null}
        {serverSyncStatus === "error" || profileLoadError ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
            <span dir="auto">{profileLoadError ?? "تعذرت المزامنة"}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

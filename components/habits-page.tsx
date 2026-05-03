"use client"

import { useState } from "react"
import { useHabits, DAYS_AR, DAYS_AR_SHORT, MEAL_TYPES, EXERCISE_TYPES } from "@/contexts/habits-context"
import { useProfile } from "@/contexts/profile-context"
import { HabitsWeightCard } from "@/components/habits-weight-card"
import { CalorieBudgetAlert } from "@/components/calorie-budget-alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, UtensilsCrossed, Dumbbell, Apple, Scale } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function formatLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** YYYY-MM-DD for `dayIndex` (0=Sun … 6=Sat, same as Date#getDay) in the same calendar week as `reference`. */
function dateForWeekdayInSameWeek(reference: Date, dayIndex: number): string {
  const diff = dayIndex - reference.getDay()
  const d = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate() + diff
  )
  return formatLocalYMD(d)
}

function WeekDayStrip({
  selectedDay,
  onSelectDay,
}: {
  selectedDay: number
  onSelectDay: (index: number) => void
}) {
  return (
    <div className="grid w-full grid-cols-7 gap-1 py-2 sm:gap-1.5 md:gap-2">
      {DAYS_AR_SHORT.map((dayShort, index) => (
        <button
          key={index}
          type="button"
          title={DAYS_AR[index]}
          aria-label={DAYS_AR[index]}
          onClick={() => onSelectDay(index)}
          className={cn(
            "flex min-h-10 w-full min-w-0 items-center justify-center rounded-md px-0.5 py-1.5 text-center text-xs font-medium leading-tight transition-colors sm:min-h-11 sm:rounded-lg sm:px-1 sm:text-sm md:rounded-xl md:px-2",
            selectedDay === index
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          {dayShort}
        </button>
      ))}
    </div>
  )
}

export function HabitsPage() {
  const {
    foodOptions,
    addFoodOption,
    removeFoodOption,
    foodLogs,
    addFoodLogEntry,
    removeFoodLogEntry,
    getFoodLogForDate,
    getDailyMacros,
    getWeeklyMacros,
    addExercise,
    removeExercise,
    getExercisesForDay,
  } = useHabits()

  const { profile } = useProfile()

  const [activeTab, setActiveTab] = useState("food")
  const [foodSubTab, setFoodSubTab] = useState<"options" | "daily">("options")
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  /** Which weekday column (0–6) is expanded under «الطعام حسب أيام الأسبوع»; only one at a time. */
  const [expandedWeekFoodDayIndex, setExpandedWeekFoodDayIndex] = useState<number | null>(null)

  // Food option dialog state
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false)
  const [newOption, setNewOption] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    servingSize: "",
    servingUnit: "غرام",
  })
  
  // Food log dialog state
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)
  const [newLogEntry, setNewLogEntry] = useState({
    foodOptionId: "",
    quantity: "1",
    mealType: "breakfast",
  })
  
  // Exercise dialog state
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({ type: "", duration: "" })

  const now = new Date()
  const todayDateStr = formatLocalYMD(now)

  const dailyMacros = getDailyMacros(todayDateStr)
  const weeklyMacros = getWeeklyMacros()
  const todayFoodLog = getFoodLogForDate(todayDateStr)
  const exercises = getExercisesForDay(selectedDay)

  const handleAddFoodOption = async () => {
    if (!newOption.name.trim() || !newOption.calories) return
    try {
      await addFoodOption({
        name: newOption.name.trim(),
        calories: Number(newOption.calories) || 0,
        protein: Number(newOption.protein) || 0,
        carbs: Number(newOption.carbs) || 0,
        fat: Number(newOption.fat) || 0,
        servingSize: Number(newOption.servingSize) || 100,
        servingUnit: newOption.servingUnit,
      })
      setNewOption({
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        servingSize: "",
        servingUnit: "غرام",
      })
      setIsOptionDialogOpen(false)
      toast.success("تمت إضافة خيار الطعام")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ خيار الطعام")
    }
  }

  const handleAddFoodLog = async () => {
    if (!newLogEntry.foodOptionId || !newLogEntry.quantity) return
    try {
      await addFoodLogEntry(todayDateStr, {
        foodOptionId: newLogEntry.foodOptionId,
        quantity: parseFloat(newLogEntry.quantity) || 1,
        mealType: newLogEntry.mealType,
      })
      setNewLogEntry({
        foodOptionId: "",
        quantity: "1",
        mealType: "breakfast",
      })
      setIsLogDialogOpen(false)
      toast.success("تم تسجيل الوجبة")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "تعذر تسجيل الوجبة")
    }
  }

  const handleAddExercise = () => {
    if (newExercise.type) {
      addExercise(
        selectedDay,
        newExercise.type,
        newExercise.duration ? parseInt(newExercise.duration) : undefined
      )
      setNewExercise({ type: "", duration: "" })
      setIsExerciseDialogOpen(false)
    }
  }

  const getFoodOptionById = (id: string) => {
    return foodOptions.find((f) => f.id === id)
  }

  const handleWeekFoodDayClick = (dayIndex: number) => {
    setExpandedWeekFoodDayIndex((prev) => (prev === dayIndex ? null : dayIndex))
  }

  return (
    <div className="p-4 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">تسجيل العادات</h1>
        <p className="text-muted-foreground text-sm">سجل طعامك وتمارينك</p>
      </div>

      <HabitsWeightCard />

      <CalorieBudgetAlert
        consumed={getDailyMacros(formatLocalYMD(now)).calories}
        target={profile.dailyCaloriesTarget}
        compact
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="food" className="gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            الطعام
          </TabsTrigger>
          <TabsTrigger value="exercise" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            التمارين
          </TabsTrigger>
        </TabsList>

        {/* Food Tab Content */}
        <TabsContent value="food" className="space-y-4 mt-4">
          {/* Weekly Macros Summary */}
          <Card className="bg-gradient-to-l from-emerald-500/10 to-transparent border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="w-4 h-4" />
                ملخص الأسبوع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">سعرات</p>
                  <p className="text-lg font-bold text-emerald-500">{Math.round(weeklyMacros.calories)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">بروتين</p>
                  <p className="text-lg font-bold text-blue-500">{Math.round(weeklyMacros.protein)}غ</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">كربوهيدرات</p>
                  <p className="text-lg font-bold text-amber-500">{Math.round(weeklyMacros.carbs)}غ</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">دهون</p>
                  <p className="text-lg font-bold text-rose-500">{Math.round(weeklyMacros.fat)}غ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Week food overview: each calendar day of this week (not tied to خيارات الطعام) */}
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">الطعام حسب أيام الأسبوع</CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed">
                نظرة على السعرات وعدد الوجبات المسجّلة لكل يوم من أسبوع التقويم الحالي
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {DAYS_AR_SHORT.map((dayShort, dayIndex) => {
                  const dateStr = dateForWeekdayInSameWeek(now, dayIndex)
                  const dayMacros = getDailyMacros(dateStr)
                  const log = getFoodLogForDate(dateStr)
                  const mealCount = log?.entries.length ?? 0
                  const isToday = dateStr === todayDateStr
                  const isOpen = expandedWeekFoodDayIndex === dayIndex
                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      onClick={() => handleWeekFoodDayClick(dayIndex)}
                      aria-expanded={isOpen}
                      aria-controls={`week-food-panel-${dayIndex}`}
                      id={`week-food-day-${dayIndex}`}
                      className={cn(
                        "flex min-h-[4.25rem] flex-col items-center justify-center rounded-lg border border-border bg-card px-0.5 py-2 text-center transition-colors hover:bg-muted/50 sm:min-h-[4.5rem] sm:px-1",
                        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        isOpen && "border-primary bg-primary/10 hover:bg-primary/15"
                      )}
                    >
                      <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                        {dayShort}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-sm">
                        {Math.round(dayMacros.calories)}
                      </span>
                      <span className="text-[9px] text-muted-foreground sm:text-[10px]">
                        {mealCount > 0 ? `${mealCount} وجبة` : "—"}
                      </span>
                    </button>
                  )
                })}
              </div>

              {expandedWeekFoodDayIndex !== null && (
                <div
                  id={`week-food-panel-${expandedWeekFoodDayIndex}`}
                  role="region"
                  aria-labelledby={`week-food-day-${expandedWeekFoodDayIndex}`}
                  className="rounded-lg border border-border bg-muted/30 p-3 sm:p-4"
                >
                  {(() => {
                    const idx = expandedWeekFoodDayIndex
                    const panelDateStr = dateForWeekdayInSameWeek(now, idx)
                    const panelLog = getFoodLogForDate(panelDateStr)
                    const panelMacros = getDailyMacros(panelDateStr)

                    return (
                      <>
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                          <p className="text-sm font-semibold text-foreground">
                            {DAYS_AR[idx]}
                            {panelDateStr === todayDateStr && (
                              <span className="ms-2 text-xs font-normal text-primary">(اليوم)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">{panelDateStr}</p>
                        </div>
                        <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            السعرات:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {Math.round(panelMacros.calories)}
                            </strong>
                          </span>
                          <span>
                            بروتين:{" "}
                            <strong className="text-blue-600 dark:text-blue-400">
                              {Math.round(panelMacros.protein)}غ
                            </strong>
                          </span>
                          <span>
                            كربو:{" "}
                            <strong className="text-amber-600 dark:text-amber-400">
                              {Math.round(panelMacros.carbs)}غ
                            </strong>
                          </span>
                          <span>
                            دهون:{" "}
                            <strong className="text-rose-600 dark:text-rose-400">
                              {Math.round(panelMacros.fat)}غ
                            </strong>
                          </span>
                        </div>

                        {!panelLog || panelLog.entries.length === 0 ? (
                          <p className="text-sm text-muted-foreground">لا توجد وجبات مسجّلة لهذا اليوم</p>
                        ) : (
                          <div className="space-y-3">
                            {MEAL_TYPES.map((meal) => {
                              const mealEntries =
                                panelLog.entries.filter((e) => e.mealType === meal.id) || []
                              if (mealEntries.length === 0) return null
                              return (
                                <div key={meal.id}>
                                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                    {meal.label}
                                  </p>
                                  <ul className="space-y-2">
                                    {mealEntries.map((entry) => {
                                      const option = getFoodOptionById(entry.foodOptionId)
                                      if (!option) return null
                                      return (
                                        <li
                                          key={entry.id}
                                          className="flex items-center justify-between gap-2 rounded-md bg-background/80 px-3 py-2"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-foreground">
                                              {option.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {entry.quantity} حصة —{" "}
                                              {Math.round(option.calories * entry.quantity)} سعرة
                                            </p>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                              void (async () => {
                                                try {
                                                  await removeFoodLogEntry(panelDateStr, entry.id)
                                                } catch (e: unknown) {
                                                  toast.error(
                                                    e instanceof Error
                                                      ? e.message
                                                      : "تعذر حذف الوجبة"
                                                  )
                                                }
                                              })()
                                            }
                                            aria-label="حذف الوجبة"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Food Sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFoodSubTab("options")}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                foodSubTab === "options"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <Apple className="w-4 h-4" />
              خيارات الطعام
            </button>
            <button
              onClick={() => setFoodSubTab("daily")}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                foodSubTab === "daily"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <UtensilsCrossed className="w-4 h-4" />
              طعام اليوم
            </button>
          </div>

          {/* Food Options Tab */}
          {foodSubTab === "options" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  سجل خيارات الطعام المتاحة لديك
                </p>
                <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="w-4 h-4" />
                      إضافة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>إضافة خيار طعام جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">اسم الطعام</label>
                        <Input
                          placeholder="مثال: أرز مع دجاج"
                          value={newOption.name}
                          onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">حجم الحصة</label>
                          <Input
                            type="number"
                            placeholder="100"
                            value={newOption.servingSize}
                            onChange={(e) => setNewOption({ ...newOption, servingSize: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">الوحدة</label>
                          <Select
                            value={newOption.servingUnit}
                            onValueChange={(value) => setNewOption({ ...newOption, servingUnit: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="غرام">غرام</SelectItem>
                              <SelectItem value="مل">مل</SelectItem>
                              <SelectItem value="قطعة">قطعة</SelectItem>
                              <SelectItem value="كوب">كوب</SelectItem>
                              <SelectItem value="ملعقة">ملعقة</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">السعرات الحرارية (لكل حصة)</label>
                        <Input
                          type="number"
                          placeholder="350"
                          value={newOption.calories}
                          onChange={(e) => setNewOption({ ...newOption, calories: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">بروتين (غ)</label>
                          <Input
                            type="number"
                            placeholder="20"
                            value={newOption.protein}
                            onChange={(e) => setNewOption({ ...newOption, protein: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">كربوهيدرات (غ)</label>
                          <Input
                            type="number"
                            placeholder="40"
                            value={newOption.carbs}
                            onChange={(e) => setNewOption({ ...newOption, carbs: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">دهون (غ)</label>
                          <Input
                            type="number"
                            placeholder="10"
                            value={newOption.fat}
                            onChange={(e) => setNewOption({ ...newOption, fat: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => void handleAddFoodOption()}
                        className="w-full"
                        disabled={!newOption.name.trim() || !newOption.calories}
                      >
                        إضافة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Food Options List */}
              {foodOptions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                      <Apple className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">لا توجد خيارات طعام</h3>
                    <p className="text-muted-foreground text-sm">
                      أضف خيارات الطعام المتاحة لديك
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {foodOptions.map((option) => (
                    <Card key={option.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{option.name}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {option.servingSize} {option.servingUnit} لكل حصة
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">
                                {option.calories} سعرة
                              </span>
                              <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                                {option.protein}غ بروتين
                              </span>
                              <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded">
                                {option.carbs}غ كربو
                              </span>
                              <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded">
                                {option.fat}غ دهون
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              void (async () => {
                                try {
                                  await removeFoodOption(option.id)
                                } catch (e: unknown) {
                                  toast.error(
                                    e instanceof Error ? e.message : "تعذر حذف خيار الطعام"
                                  )
                                }
                              })()
                            }
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Daily Food Log Tab */}
          {foodSubTab === "daily" && (
            <div className="space-y-4">
              {/* Today's Macros */}
              <Card className="bg-gradient-to-l from-blue-500/10 to-transparent border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">سعرات اليوم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-500">{Math.round(dailyMacros.calories)}</p>
                      <p className="text-xs text-muted-foreground">سعرة</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{Math.round(dailyMacros.protein)}</p>
                      <p className="text-xs text-muted-foreground">بروتين</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-500">{Math.round(dailyMacros.carbs)}</p>
                      <p className="text-xs text-muted-foreground">كربو</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-rose-500">{Math.round(dailyMacros.fat)}</p>
                      <p className="text-xs text-muted-foreground">دهون</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Food Log Button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">سجل ما أكلته اليوم</p>
                <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1" disabled={foodOptions.length === 0}>
                      <Plus className="w-4 h-4" />
                      تسجيل وجبة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>تسجيل وجبة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">اختر الطعام</label>
                        <Select
                          value={newLogEntry.foodOptionId}
                          onValueChange={(value) => setNewLogEntry({ ...newLogEntry, foodOptionId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر من خيارات الطعام" />
                          </SelectTrigger>
                          <SelectContent>
                            {foodOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name} ({option.calories} سعرة)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">نوع الوجبة</label>
                        <Select
                          value={newLogEntry.mealType}
                          onValueChange={(value) => setNewLogEntry({ ...newLogEntry, mealType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEAL_TYPES.map((meal) => (
                              <SelectItem key={meal.id} value={meal.id}>
                                {meal.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">عدد الحصص</label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0.5"
                          placeholder="1"
                          value={newLogEntry.quantity}
                          onChange={(e) => setNewLogEntry({ ...newLogEntry, quantity: e.target.value })}
                        />
                      </div>
                      <Button
                        onClick={() => void handleAddFoodLog()}
                        className="w-full"
                        disabled={!newLogEntry.foodOptionId}
                      >
                        تسجيل
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Food Log List by Meal Type */}
              {MEAL_TYPES.map((meal) => {
                const mealEntries = todayFoodLog?.entries.filter((e) => e.mealType === meal.id) || []
                if (mealEntries.length === 0) return null
                
                return (
                  <Card key={meal.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{meal.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {mealEntries.map((entry) => {
                        const option = getFoodOptionById(entry.foodOptionId)
                        if (!option) return null
                        
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-foreground">{option.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.quantity} حصة - {Math.round(option.calories * entry.quantity)} سعرة
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                void (async () => {
                                  try {
                                    await removeFoodLogEntry(todayDateStr, entry.id)
                                  } catch (e: unknown) {
                                    toast.error(
                                      e instanceof Error ? e.message : "تعذر حذف الوجبة"
                                    )
                                  }
                                })()
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}

              {(!todayFoodLog || todayFoodLog.entries.length === 0) && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
                      <UtensilsCrossed className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">لم تسجل أي وجبات اليوم</h3>
                    <p className="text-muted-foreground text-sm">
                      {foodOptions.length === 0 
                        ? "أضف خيارات طعام أولاً ثم سجل وجباتك"
                        : "اضغط على تسجيل وجبة لبدء التتبع"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Exercise Tab Content */}
        <TabsContent value="exercise" className="space-y-4 mt-4">
          <WeekDayStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />

          {/* Add Exercise */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">تمارين {DAYS_AR[selectedDay]}</p>
              <p className="text-sm text-muted-foreground">{exercises.length} تمارين مسجلة</p>
            </div>
            <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  إضافة تمرين
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة تمرين ليوم {DAYS_AR[selectedDay]}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نوع التمرين</label>
                    <Select
                      value={newExercise.type}
                      onValueChange={(value) => setNewExercise({ ...newExercise, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع التمرين" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXERCISE_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المدة (بالدقائق) - اختياري</label>
                    <Input
                      type="number"
                      placeholder="مثال: 30"
                      value={newExercise.duration}
                      onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddExercise} className="w-full" disabled={!newExercise.type}>
                    إضافة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Exercise List */}
          {exercises.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Dumbbell className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">لا توجد تمارين</h3>
                <p className="text-muted-foreground text-sm">
                  أضف تمارينك ليوم {DAYS_AR[selectedDay]}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {exercises.map((exercise) => {
                const exerciseType = EXERCISE_TYPES.find((t) => t.id === exercise.exerciseType)
                return (
                  <Card key={exercise.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                          {exerciseType?.icon || "🏃"}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{exerciseType?.label}</p>
                          {exercise.duration && (
                            <p className="text-xs text-muted-foreground">{exercise.duration} دقيقة</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExercise(exercise.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

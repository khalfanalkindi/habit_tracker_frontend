"use client"

import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useProfile, computeBmi } from "@/contexts/profile-context"
import { useHabits, DAYS_AR, EXERCISE_TYPES, MEAL_TYPES } from "@/contexts/habits-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalorieBudgetAlert } from "@/components/calorie-budget-alert"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  CheckCircle2,
  Circle,
  Flame,
  Target,
  TrendingUp,
  Dumbbell,
  UtensilsCrossed,
  Scale,
  Ruler,
  Activity,
} from "lucide-react"

export function Dashboard() {
  const { user } = useAuth()
  const { profile, getLatestWeightKg } = useProfile()
  const {
    foodOptions,
    getDailyMacros,
    getWeeklyMacros,
    getFoodLogForDate,
    exercisePlan,
    toggleExerciseCompletion,
    getWeeklyExerciseStats,
  } = useHabits()

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const todayDayOfWeek = today.getDay()

  const dailyMacros = getDailyMacros(todayStr)
  const weeklyMacros = getWeeklyMacros()
  const { completed: exercisesCompleted, total: totalExercises } = getWeeklyExerciseStats()
  const exerciseCompletionRate = totalExercises > 0 
    ? Math.round((exercisesCompleted / totalExercises) * 100) 
    : 0

  const todayFood = getFoodLogForDate(todayStr)
  const todayExercises = exercisePlan.filter((e) => e.dayOfWeek === todayDayOfWeek)

  const getFoodOptionById = (id: string) => {
    return foodOptions.find((f) => f.id === id)
  }

  const latestWeight = getLatestWeightKg()
  const bmi = computeBmi(latestWeight, profile.heightM)

  const weightChartData = useMemo(() => {
    return [...profile.weightHistory]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        short: e.date.slice(5),
        weight: e.weightKg,
      }))
  }, [profile.weightHistory])

  return (
    <div className="p-4 pb-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
          أهلاً، {user?.name || "مستخدم"}!
        </h1>
        <p className="text-muted-foreground">
          {today.toLocaleDateString("ar-SA", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <CalorieBudgetAlert
        consumed={dailyMacros.calories}
        target={profile.dailyCaloriesTarget}
      />

      {/* Profile + BMI (from settings / weight log) */}
      <Card className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            ملخصك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Ruler className="w-3 h-3" /> الطول
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {profile.heightM != null ? `${profile.heightM} م` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Scale className="w-3 h-3" /> الوزن
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {latestWeight != null ? `${latestWeight.toFixed(1)} كغ` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" /> هدف الوزن
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {profile.weightGoalKg != null ? `${profile.weightGoalKg} كغ` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3" /> هدف السعرات
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {profile.dailyCaloriesTarget != null
                  ? `${Math.round(profile.dailyCaloriesTarget)} سعرة`
                  : "—"}
              </p>
            </div>
            <div className="col-span-2 rounded-xl bg-primary/10 border border-primary/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مؤشر كتلة الجسم (BMI)</p>
                <p className="text-2xl font-extrabold text-primary tabular-nums">
                  {bmi != null ? bmi : "—"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground max-w-[55%] text-left leading-relaxed">
                {bmi == null
                  ? "أدخل الطول والوزن من الإعدادات أو سجّل وزنك من صفحة العادات."
                  : "قيمة تقريبية من وزنك الحالي وطولك؛ للاسترشاد فقط."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4 text-violet-500" />
            تطور الوزن
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weightChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              لا توجد نقاط بعد. سجّل وزنك من صفحة «تسجيل العادات» ليظهر المخطط هنا.
            </p>
          ) : (
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="short" tick={{ fontSize: 11 }} />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 11 }}
                    width={36}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(1)} كغ`, "الوزن"]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { date?: string } | undefined
                      return row?.date ?? ""
                    }}
                    contentStyle={{ borderRadius: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(262 83% 58%)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Macros */}
      <Card className="bg-gradient-to-l from-emerald-500/10 to-transparent border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            سعرات اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.dailyCaloriesTarget != null && profile.dailyCaloriesTarget > 0 && (
            <p className="text-xs text-muted-foreground mb-3 text-center">
              الهدف اليومي: {Math.round(profile.dailyCaloriesTarget)} سعرة
              {" · "}
              المتبقي تقريباً:{" "}
              <span
                className={
                  dailyMacros.calories > profile.dailyCaloriesTarget
                    ? "text-destructive font-semibold"
                    : "text-emerald-600 font-semibold"
                }
              >
                {Math.round(profile.dailyCaloriesTarget - dailyMacros.calories)}
              </span>
            </p>
          )}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-bl from-amber-500/10 to-transparent border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Flame className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{Math.round(weeklyMacros.calories)}</p>
                <p className="text-xs text-muted-foreground">سعرات الأسبوع</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-bl from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{exercisesCompleted}/{totalExercises}</p>
                <p className="text-xs text-muted-foreground">تمارين مكتملة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-bl from-cyan-500/10 to-transparent border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-500">{exerciseCompletionRate}%</p>
                <p className="text-xs text-muted-foreground">نسبة الإنجاز</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-bl from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{Math.round(weeklyMacros.protein)}غ</p>
                <p className="text-xs text-muted-foreground">بروتين الأسبوع</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Exercises */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            تمارين اليوم - {DAYS_AR[todayDayOfWeek]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayExercises.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              لا توجد تمارين مجدولة لهذا اليوم. أضف تمارينك من صفحة العادات!
            </p>
          ) : (
            todayExercises.map((exercise) => {
              const exerciseType = EXERCISE_TYPES.find((t) => t.id === exercise.exerciseType)

              return (
                <Button
                  key={exercise.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-3"
                  onClick={() => toggleExerciseCompletion(exercise.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                      {exerciseType?.icon || "🏃"}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-medium text-foreground">{exerciseType?.label}</p>
                      {exercise.duration && (
                        <p className="text-xs text-muted-foreground">
                          {exercise.duration} دقيقة
                        </p>
                      )}
                    </div>
                    {exercise.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                </Button>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Today's Food Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
            ملخص طعام اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!todayFood || todayFood.entries.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              لم تسجل أي طعام اليوم. ابدأ بتسجيل وجباتك!
            </p>
          ) : (
            <div className="space-y-3">
              {MEAL_TYPES.map((meal) => {
                const mealEntries = todayFood.entries.filter((e) => e.mealType === meal.id)
                if (mealEntries.length === 0) return null

                const mealCalories = mealEntries.reduce((total, entry) => {
                  const option = getFoodOptionById(entry.foodOptionId)
                  return total + (option ? option.calories * entry.quantity : 0)
                }, 0)

                return (
                  <div key={meal.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{meal.label}</p>
                      <p className="text-xs text-muted-foreground">{mealEntries.length} عناصر</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-500">{Math.round(mealCalories)}</p>
                      <p className="text-xs text-muted-foreground">سعرة</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

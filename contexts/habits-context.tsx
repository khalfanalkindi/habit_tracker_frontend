"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import {
  apiDeleteExerciseEntry,
  apiDeleteFoodLogEntry,
  apiDeleteFoodOption,
  apiListExerciseEntries,
  apiListFoodLogEntries,
  apiListFoodOptions,
  apiPatchExerciseEntry,
  apiPatchFoodOption,
  apiPostExerciseEntry,
  apiPostFoodLogEntry,
  apiPostFoodOption,
  type ExerciseEntryRead,
  type FoodLogEntryRead,
  type FoodOptionRead,
} from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { habitsStorageKeys } from "@/lib/client-storage-keys"

// Days of the week in Arabic
export const DAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
]

/** Shorter labels for tight one-row selectors (same order as DAYS_AR). */
export const DAYS_AR_SHORT = [
  "أحد",
  "إثنين",
  "ثلاثاء",
  "أربعاء",
  "خميس",
  "جمعة",
  "سبت",
]

// Meal types
export const MEAL_TYPES = [
  { id: "breakfast", label: "فطور" },
  { id: "lunch", label: "غداء" },
  { id: "dinner", label: "عشاء" },
  { id: "snacks", label: "وجبات خفيفة" },
]

// Exercise types
export const EXERCISE_TYPES = [
  { id: "gym", label: "نادي رياضي", icon: "🏋️" },
  { id: "walk", label: "مشي", icon: "🚶" },
  { id: "cardio", label: "كارديو", icon: "🏃" },
  { id: "swim", label: "سباحة", icon: "🏊" },
  { id: "yoga", label: "يوغا", icon: "🧘" },
  { id: "cycling", label: "دراجة", icon: "🚴" },
  { id: "resistance", label: "مقاومة", icon: "💪" },
]

// Food option (the registered food database)
export type FoodOption = {
  id: string
  name: string
  calories: number // per serving
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  servingSize: number // grams or ml
  servingUnit: string // "غرام" or "مل"
}

// Food log entry (what was eaten on a specific day)
export type FoodLogEntry = {
  id: string
  foodOptionId: string
  quantity: number // number of servings
  mealType: string
}

// Daily food log
export type DailyFoodLog = {
  date: string
  entries: FoodLogEntry[]
}

// Exercise entry
export type ExerciseEntry = {
  id: string
  dayOfWeek: number
  exerciseType: string
  duration?: number
  completed: boolean
  date?: string
}

function wireToExerciseEntry(w: ExerciseEntryRead): ExerciseEntry {
  const e: ExerciseEntry = {
    id: w.id,
    dayOfWeek: w.dayOfWeek,
    exerciseType: w.exerciseType,
    completed: w.completed,
  }
  if (w.duration != null && Number.isFinite(w.duration)) e.duration = w.duration
  if (w.date) e.date = w.date
  return e
}

function wireToFoodOption(w: FoodOptionRead): FoodOption {
  return {
    id: w.id,
    name: w.name,
    calories: w.calories,
    protein: w.protein,
    carbs: w.carbs,
    fat: w.fat,
    servingSize: w.servingSize,
    servingUnit: w.servingUnit,
  }
}

function localYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function groupLogsFromApi(rows: FoodLogEntryRead[]): DailyFoodLog[] {
  const map = new Map<string, FoodLogEntry[]>()
  for (const r of rows) {
    const date = r.logDate
    const entry: FoodLogEntry = {
      id: r.id,
      foodOptionId: r.foodOptionId,
      mealType: r.mealType,
      quantity: r.quantity,
    }
    const list = map.get(date)
    if (list) list.push(entry)
    else map.set(date, [entry])
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => ({ date, entries }))
}

type HabitsContextType = {
  foodOptions: FoodOption[]
  addFoodOption: (food: Omit<FoodOption, "id">) => Promise<void>
  removeFoodOption: (id: string) => Promise<void>
  updateFoodOption: (id: string, food: Partial<Omit<FoodOption, "id">>) => Promise<void>

  foodLogs: DailyFoodLog[]
  addFoodLogEntry: (date: string, entry: Omit<FoodLogEntry, "id">) => Promise<void>
  removeFoodLogEntry: (date: string, entryId: string) => Promise<void>
  getFoodLogForDate: (date: string) => DailyFoodLog | undefined

  getDailyMacros: (date: string) => { calories: number; protein: number; carbs: number; fat: number }
  getWeeklyMacros: () => { calories: number; protein: number; carbs: number; fat: number }

  exercisePlan: ExerciseEntry[]
  addExercise: (dayOfWeek: number, exerciseType: string, duration?: number) => Promise<void>
  removeExercise: (id: string) => Promise<void>
  toggleExerciseCompletion: (id: string) => Promise<void>
  getExercisesForDay: (dayOfWeek: number) => ExerciseEntry[]
  getWeeklyExerciseStats: () => { completed: number; total: number }
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined)

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const { apiMode, user } = useAuth()
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([])
  const [foodLogs, setFoodLogs] = useState<DailyFoodLog[]>([])
  const [exercisePlan, setExercisePlan] = useState<ExerciseEntry[]>([])
  const exercisePlanRef = useRef<ExerciseEntry[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    exercisePlanRef.current = exercisePlan
  }, [exercisePlan])

  /** Offline: single shared localStorage bucket (no user id). */
  useEffect(() => {
    if (apiMode) return
    const keys = habitsStorageKeys(false, null)
    const storedOptions = localStorage.getItem(keys.foodOptions)
    const storedLogs = localStorage.getItem(keys.foodLogs)
    const storedExercise = localStorage.getItem(keys.exercise)
    if (storedOptions) {
      try {
        setFoodOptions(JSON.parse(storedOptions))
      } catch {
        localStorage.removeItem(keys.foodOptions)
        setFoodOptions([])
      }
    } else setFoodOptions([])
    if (storedLogs) {
      try {
        setFoodLogs(JSON.parse(storedLogs))
      } catch {
        localStorage.removeItem(keys.foodLogs)
        setFoodLogs([])
      }
    } else setFoodLogs([])
    if (storedExercise) {
      try {
        setExercisePlan(JSON.parse(storedExercise))
      } catch {
        localStorage.removeItem(keys.exercise)
        setExercisePlan([])
      }
    } else setExercisePlan([])
    setIsInitialized(true)
  }, [apiMode])

  /** API configured but not logged in — empty state, do not write another user's cache. */
  useEffect(() => {
    if (!apiMode || user) return
    setFoodOptions([])
    setFoodLogs([])
    setExercisePlan([])
    setIsInitialized(true)
  }, [apiMode, user])

  const loadSyncedHabitsFromApi = useCallback(async () => {
    if (!apiMode || !user) return
    const keys = habitsStorageKeys(true, user.id)
    try {
      const [options, logs, exercises] = await Promise.all([
        apiListFoodOptions(),
        apiListFoodLogEntries(),
        apiListExerciseEntries(),
      ])
      setFoodOptions(options.map(wireToFoodOption))
      setFoodLogs(groupLogsFromApi(logs))
      setExercisePlan(exercises.map(wireToExerciseEntry))
    } catch {
      const o = localStorage.getItem(keys.foodOptions)
      const l = localStorage.getItem(keys.foodLogs)
      const ex = localStorage.getItem(keys.exercise)
      try {
        if (o) setFoodOptions(JSON.parse(o))
        else setFoodOptions([])
      } catch {
        setFoodOptions([])
      }
      try {
        if (l) setFoodLogs(JSON.parse(l))
        else setFoodLogs([])
      } catch {
        setFoodLogs([])
      }
      try {
        if (ex) setExercisePlan(JSON.parse(ex))
        else setExercisePlan([])
      } catch {
        setExercisePlan([])
      }
    }
  }, [apiMode, user])

  /** Logged in + API: clear previous account from memory, then hydrate from server (fallback: this user's localStorage). */
  useEffect(() => {
    if (!apiMode || !user) return
    setIsInitialized(true)
    setFoodOptions([])
    setFoodLogs([])
    setExercisePlan([])
    let cancelled = false
    const keys = habitsStorageKeys(true, user.id)
    void (async () => {
      try {
        const [options, logs, exercises] = await Promise.all([
          apiListFoodOptions(),
          apiListFoodLogEntries(),
          apiListExerciseEntries(),
        ])
        if (!cancelled) {
          setFoodOptions(options.map(wireToFoodOption))
          setFoodLogs(groupLogsFromApi(logs))
          setExercisePlan(exercises.map(wireToExerciseEntry))
        }
      } catch {
        if (cancelled) return
        const o = localStorage.getItem(keys.foodOptions)
        const l = localStorage.getItem(keys.foodLogs)
        const ex = localStorage.getItem(keys.exercise)
        try {
          if (o) setFoodOptions(JSON.parse(o))
          else setFoodOptions([])
        } catch {
          setFoodOptions([])
        }
        try {
          if (l) setFoodLogs(JSON.parse(l))
          else setFoodLogs([])
        } catch {
          setFoodLogs([])
        }
        try {
          if (ex) setExercisePlan(JSON.parse(ex))
          else setExercisePlan([])
        } catch {
          setExercisePlan([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiMode, user?.id])

  useEffect(() => {
    if (!isInitialized || !apiMode || !user) return
    let debounce: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => {
        debounce = null
        void loadSyncedHabitsFromApi()
      }, 400)
    }
    document.addEventListener("visibilitychange", schedule)
    window.addEventListener("focus", schedule)
    return () => {
      document.removeEventListener("visibilitychange", schedule)
      window.removeEventListener("focus", schedule)
      if (debounce) clearTimeout(debounce)
    }
  }, [isInitialized, apiMode, user, loadSyncedHabitsFromApi])

  useEffect(() => {
    if (!isInitialized) return
    if (apiMode && !user) return
    const keys = habitsStorageKeys(apiMode, user?.id)
    localStorage.setItem(keys.foodOptions, JSON.stringify(foodOptions))
  }, [foodOptions, isInitialized, apiMode, user?.id])

  useEffect(() => {
    if (!isInitialized) return
    if (apiMode && !user) return
    const keys = habitsStorageKeys(apiMode, user?.id)
    localStorage.setItem(keys.foodLogs, JSON.stringify(foodLogs))
  }, [foodLogs, isInitialized, apiMode, user?.id])

  useEffect(() => {
    if (!isInitialized) return
    if (apiMode && !user) return
    const keys = habitsStorageKeys(apiMode, user?.id)
    localStorage.setItem(keys.exercise, JSON.stringify(exercisePlan))
  }, [exercisePlan, isInitialized, apiMode, user?.id])

  const addFoodOption = useCallback(
    async (food: Omit<FoodOption, "id">) => {
      if (apiMode && user) {
        const w = await apiPostFoodOption({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          servingSize: food.servingSize,
          servingUnit: food.servingUnit,
        })
        setFoodOptions((prev) => [...prev, wireToFoodOption(w)])
        return
      }
      const newFood: FoodOption = { ...food, id: crypto.randomUUID() }
      setFoodOptions((prev) => [...prev, newFood])
    },
    [apiMode, user]
  )

  const removeFoodOption = useCallback(
    async (id: string) => {
      if (apiMode && user) {
        await apiDeleteFoodOption(id)
      }
      setFoodOptions((prev) => prev.filter((f) => f.id !== id))
    },
    [apiMode, user]
  )

  const updateFoodOption = useCallback(
    async (id: string, food: Partial<Omit<FoodOption, "id">>) => {
      if (apiMode && user) {
        const patch: Partial<Omit<FoodOptionRead, "id">> = {}
        if (food.name !== undefined) patch.name = food.name
        if (food.calories !== undefined) patch.calories = food.calories
        if (food.protein !== undefined) patch.protein = food.protein
        if (food.carbs !== undefined) patch.carbs = food.carbs
        if (food.fat !== undefined) patch.fat = food.fat
        if (food.servingSize !== undefined) patch.servingSize = food.servingSize
        if (food.servingUnit !== undefined) patch.servingUnit = food.servingUnit
        const w = await apiPatchFoodOption(id, patch)
        setFoodOptions((prev) => prev.map((f) => (f.id === id ? wireToFoodOption(w) : f)))
        return
      }
      setFoodOptions((prev) => prev.map((f) => (f.id === id ? { ...f, ...food } : f)))
    },
    [apiMode, user]
  )

  const addFoodLogEntry = useCallback(
    async (date: string, entry: Omit<FoodLogEntry, "id">) => {
      if (apiMode && user) {
        const r = await apiPostFoodLogEntry({
          logDate: date,
          foodOptionId: entry.foodOptionId,
          mealType: entry.mealType,
          quantity: entry.quantity,
        })
        const newEntry: FoodLogEntry = {
          id: r.id,
          foodOptionId: r.foodOptionId,
          mealType: r.mealType,
          quantity: r.quantity,
        }
        setFoodLogs((prev) => {
          const existingLog = prev.find((log) => log.date === date)
          if (existingLog) {
            return prev.map((log) =>
              log.date === date ? { ...log, entries: [...log.entries, newEntry] } : log
            )
          }
          return [...prev, { date, entries: [newEntry] }]
        })
        return
      }
      const newEntry: FoodLogEntry = { ...entry, id: crypto.randomUUID() }
      setFoodLogs((prev) => {
        const existingLog = prev.find((log) => log.date === date)
        if (existingLog) {
          return prev.map((log) =>
            log.date === date ? { ...log, entries: [...log.entries, newEntry] } : log
          )
        }
        return [...prev, { date, entries: [newEntry] }]
      })
    },
    [apiMode, user]
  )

  const removeFoodLogEntry = useCallback(
    async (date: string, entryId: string) => {
      if (apiMode && user) {
        await apiDeleteFoodLogEntry(entryId)
      }
      setFoodLogs((prev) =>
        prev
          .map((log) =>
            log.date === date
              ? { ...log, entries: log.entries.filter((e) => e.id !== entryId) }
              : log
          )
          .filter((log) => log.entries.length > 0)
      )
    },
    [apiMode, user]
  )

  const getFoodLogForDate = useCallback(
    (date: string) => {
      return foodLogs.find((log) => log.date === date)
    },
    [foodLogs]
  )

  const getDailyMacros = useCallback(
    (date: string) => {
      const log = getFoodLogForDate(date)
      if (!log) return { calories: 0, protein: 0, carbs: 0, fat: 0 }

      return log.entries.reduce(
        (acc, entry) => {
          const option = foodOptions.find((f) => f.id === entry.foodOptionId)
          if (!option) return acc

          return {
            calories: acc.calories + option.calories * entry.quantity,
            protein: acc.protein + option.protein * entry.quantity,
            carbs: acc.carbs + option.carbs * entry.quantity,
            fat: acc.fat + option.fat * entry.quantity,
          }
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
    },
    [foodOptions, getFoodLogForDate]
  )

  const getWeeklyMacros = useCallback(() => {
    const today = new Date()
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }

    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
      const dateStr = localYMD(d)
      const daily = getDailyMacros(dateStr)

      totals.calories += daily.calories
      totals.protein += daily.protein
      totals.carbs += daily.carbs
      totals.fat += daily.fat
    }

    return totals
  }, [getDailyMacros])

  const addExercise = useCallback(
    async (dayOfWeek: number, exerciseType: string, duration?: number) => {
      const dur =
        duration != null && Number.isFinite(duration) && duration >= 1
          ? Math.trunc(duration)
          : undefined
      if (apiMode && user) {
        const payload: {
          dayOfWeek: number
          exerciseType: string
          completed: boolean
          duration?: number
        } = { dayOfWeek, exerciseType, completed: false }
        if (dur !== undefined) payload.duration = dur
        const r = await apiPostExerciseEntry(payload)
        setExercisePlan((prev) => [...prev, wireToExerciseEntry(r)])
        return
      }
      const newExercise: ExerciseEntry = {
        id: crypto.randomUUID(),
        dayOfWeek,
        exerciseType,
        duration: dur,
        completed: false,
      }
      setExercisePlan((prev) => [...prev, newExercise])
    },
    [apiMode, user]
  )

  const removeExercise = useCallback(
    async (id: string) => {
      if (apiMode && user) {
        await apiDeleteExerciseEntry(id)
      }
      setExercisePlan((prev) => prev.filter((e) => e.id !== id))
    },
    [apiMode, user]
  )

  const toggleExerciseCompletion = useCallback(
    async (id: string) => {
      const entry = exercisePlanRef.current.find((e) => e.id === id)
      if (!entry) return
      const todayStr = localYMD(new Date())
      const nextCompleted = !entry.completed
      if (apiMode && user) {
        const r = await apiPatchExerciseEntry(id, {
          completed: nextCompleted,
          date: nextCompleted ? todayStr : null,
        })
        setExercisePlan((prev) => prev.map((e) => (e.id === id ? wireToExerciseEntry(r) : e)))
        return
      }
      setExercisePlan((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, completed: nextCompleted, date: nextCompleted ? todayStr : undefined }
            : e
        )
      )
    },
    [apiMode, user]
  )

  const getExercisesForDay = useCallback(
    (dayOfWeek: number) => {
      return exercisePlan.filter((e) => e.dayOfWeek === dayOfWeek)
    },
    [exercisePlan]
  )

  const getWeeklyExerciseStats = useCallback(() => {
    const total = exercisePlan.length
    const completed = exercisePlan.filter((e) => e.completed).length
    return { completed, total }
  }, [exercisePlan])

  const value = useMemo(
    () => ({
      foodOptions,
      addFoodOption,
      removeFoodOption,
      updateFoodOption,
      foodLogs,
      addFoodLogEntry,
      removeFoodLogEntry,
      getFoodLogForDate,
      getDailyMacros,
      getWeeklyMacros,
      exercisePlan,
      addExercise,
      removeExercise,
      toggleExerciseCompletion,
      getExercisesForDay,
      getWeeklyExerciseStats,
    }),
    [
      foodOptions,
      addFoodOption,
      removeFoodOption,
      updateFoodOption,
      foodLogs,
      addFoodLogEntry,
      removeFoodLogEntry,
      getFoodLogForDate,
      getDailyMacros,
      getWeeklyMacros,
      exercisePlan,
      addExercise,
      removeExercise,
      toggleExerciseCompletion,
      getExercisesForDay,
      getWeeklyExerciseStats,
    ]
  )

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
}

export const useHabits = () => {
  const context = useContext(HabitsContext)
  if (context === undefined) {
    throw new Error("useHabits must be used within a HabitsProvider")
  }
  return context
}

"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

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

type HabitsContextType = {
  // Food options (database)
  foodOptions: FoodOption[]
  addFoodOption: (food: Omit<FoodOption, "id">) => void
  removeFoodOption: (id: string) => void
  updateFoodOption: (id: string, food: Partial<Omit<FoodOption, "id">>) => void
  
  // Daily food logs
  foodLogs: DailyFoodLog[]
  addFoodLogEntry: (date: string, entry: Omit<FoodLogEntry, "id">) => void
  removeFoodLogEntry: (date: string, entryId: string) => void
  getFoodLogForDate: (date: string) => DailyFoodLog | undefined
  
  // Macros calculations
  getDailyMacros: (date: string) => { calories: number; protein: number; carbs: number; fat: number }
  getWeeklyMacros: () => { calories: number; protein: number; carbs: number; fat: number }
  
  // Exercise tracking
  exercisePlan: ExerciseEntry[]
  addExercise: (dayOfWeek: number, exerciseType: string, duration?: number) => void
  removeExercise: (id: string) => void
  toggleExerciseCompletion: (id: string) => void
  getExercisesForDay: (dayOfWeek: number) => ExerciseEntry[]
  getWeeklyExerciseStats: () => { completed: number; total: number }
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined)

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([])
  const [foodLogs, setFoodLogs] = useState<DailyFoodLog[]>([])
  const [exercisePlan, setExercisePlan] = useState<ExerciseEntry[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const storedOptions = localStorage.getItem("habit-tracker-food-options")
    const storedLogs = localStorage.getItem("habit-tracker-food-logs")
    const storedExercise = localStorage.getItem("habit-tracker-exercise")
    
    if (storedOptions) {
      try {
        setFoodOptions(JSON.parse(storedOptions))
      } catch {
        localStorage.removeItem("habit-tracker-food-options")
      }
    }
    
    if (storedLogs) {
      try {
        setFoodLogs(JSON.parse(storedLogs))
      } catch {
        localStorage.removeItem("habit-tracker-food-logs")
      }
    }
    
    if (storedExercise) {
      try {
        setExercisePlan(JSON.parse(storedExercise))
      } catch {
        localStorage.removeItem("habit-tracker-exercise")
      }
    }
    
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("habit-tracker-food-options", JSON.stringify(foodOptions))
    }
  }, [foodOptions, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("habit-tracker-food-logs", JSON.stringify(foodLogs))
    }
  }, [foodLogs, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("habit-tracker-exercise", JSON.stringify(exercisePlan))
    }
  }, [exercisePlan, isInitialized])

  // Food options functions
  const addFoodOption = (food: Omit<FoodOption, "id">) => {
    const newFood: FoodOption = { ...food, id: crypto.randomUUID() }
    setFoodOptions((prev) => [...prev, newFood])
  }

  const removeFoodOption = (id: string) => {
    setFoodOptions((prev) => prev.filter((f) => f.id !== id))
  }

  const updateFoodOption = (id: string, food: Partial<Omit<FoodOption, "id">>) => {
    setFoodOptions((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...food } : f))
    )
  }

  // Food log functions
  const addFoodLogEntry = (date: string, entry: Omit<FoodLogEntry, "id">) => {
    const newEntry: FoodLogEntry = { ...entry, id: crypto.randomUUID() }
    
    setFoodLogs((prev) => {
      const existingLog = prev.find((log) => log.date === date)
      
      if (existingLog) {
        return prev.map((log) =>
          log.date === date
            ? { ...log, entries: [...log.entries, newEntry] }
            : log
        )
      } else {
        return [...prev, { date, entries: [newEntry] }]
      }
    })
  }

  const removeFoodLogEntry = (date: string, entryId: string) => {
    setFoodLogs((prev) =>
      prev.map((log) =>
        log.date === date
          ? { ...log, entries: log.entries.filter((e) => e.id !== entryId) }
          : log
      )
    )
  }

  const getFoodLogForDate = (date: string) => {
    return foodLogs.find((log) => log.date === date)
  }

  // Macros calculations
  const getDailyMacros = (date: string) => {
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
  }

  const getWeeklyMacros = () => {
    const today = new Date()
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const daily = getDailyMacros(dateStr)
      
      totals.calories += daily.calories
      totals.protein += daily.protein
      totals.carbs += daily.carbs
      totals.fat += daily.fat
    }
    
    return totals
  }

  // Exercise functions
  const addExercise = (dayOfWeek: number, exerciseType: string, duration?: number) => {
    const newExercise: ExerciseEntry = {
      id: crypto.randomUUID(),
      dayOfWeek,
      exerciseType,
      duration,
      completed: false,
    }
    setExercisePlan((prev) => [...prev, newExercise])
  }

  const removeExercise = (id: string) => {
    setExercisePlan((prev) => prev.filter((e) => e.id !== id))
  }

  const toggleExerciseCompletion = (id: string) => {
    const today = new Date().toISOString().split("T")[0]
    setExercisePlan((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, completed: !e.completed, date: !e.completed ? today : undefined }
          : e
      )
    )
  }

  const getExercisesForDay = (dayOfWeek: number) => {
    return exercisePlan.filter((e) => e.dayOfWeek === dayOfWeek)
  }

  const getWeeklyExerciseStats = () => {
    const total = exercisePlan.length
    const completed = exercisePlan.filter((e) => e.completed).length
    return { completed, total }
  }

  return (
    <HabitsContext.Provider
      value={{
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
      }}
    >
      {children}
    </HabitsContext.Provider>
  )
}

export const useHabits = () => {
  const context = useContext(HabitsContext)
  if (context === undefined) {
    throw new Error("useHabits must be used within a HabitsProvider")
  }
  return context
}

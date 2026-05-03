/**
 * localStorage keys: offline uses a single bucket; with API + logged-in user, data is per user id
 * so switching accounts does not show the previous user's cached profile / habits.
 */

export const PROFILE_STORAGE_OFFLINE = "habit-tracker-profile"

export function profileStorageKey(apiMode: boolean, userId: string | null | undefined): string {
  if (apiMode && userId) return `${PROFILE_STORAGE_OFFLINE}:${userId}`
  return PROFILE_STORAGE_OFFLINE
}

export function habitsStorageKeys(apiMode: boolean, userId: string | null | undefined) {
  const suffix = apiMode && userId ? `:${userId}` : ""
  return {
    foodOptions: `habit-tracker-food-options${suffix}`,
    foodLogs: `habit-tracker-food-logs${suffix}`,
    exercise: `habit-tracker-exercise${suffix}`,
  } as const
}

import { db } from '@/services/db'
import type { CompletionHistoryEntry, DailyPlan } from '@/models'

/**
 * Read-only. Both fetch the full table rather than a Dexie-range query —
 * `completionHistory.completedAt` is a UTC `toISOString()` timestamp, so a
 * raw string-range comparison against local calendar-day boundaries would
 * have the same off-by-one risk `date.ts` already works around elsewhere;
 * `useInsights()` instead converts each entry's `completedAt` to a local
 * date via `localIso()` and filters in JS. `dailyPlans.date` is already a
 * clean local YYYY-MM-DD string (see plannerService), so it *could* use a
 * `.where('date').between(...)` range query safely, but fetching
 * everything and filtering alongside completionHistory keeps both on the
 * same "small personal dataset, filter client-side" approach the rest of
 * this app already uses (useTasks() et al.), rather than mixing two
 * different querying strategies for what's ultimately one composable.
 */
export function listCompletionHistory(): Promise<CompletionHistoryEntry[]> {
  return db.completionHistory.toArray()
}

export function listDailyPlans(): Promise<DailyPlan[]> {
  return db.dailyPlans.toArray()
}

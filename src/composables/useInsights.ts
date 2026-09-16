import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import * as insightsService from '@/services/insightsService'
import * as recurrenceService from '@/services/recurrenceService'
import { dateOffsetIso, localIso, todayIso } from '@/utils/date'

import { useLiveQuery } from './useLiveQuery'
import { useTasks } from './useTasks'
import { summarizeWorkload } from './useWorkload'

export type InsightsRange = 'week' | 'month' | 'all'

// Before any realistic data, so `inRange()` can use one lexical
// string-comparison for every range including "all time" instead of a
// separate unbounded-lower-bound branch.
const EARLIEST_SENTINEL = '0000-01-01'

/**
 * Rolling windows (last 7 / last 30 days), not calendar-week/month
 * boundaries — consistent with the rolling-window precedent already used
 * elsewhere (Today's "Upcoming deadlines" rolling 6 days, recurrence
 * generation's rolling 30 days) rather than introducing calendar-aligned
 * start-of-week/month math nothing else in the app needs.
 */
export function useInsights(range: MaybeRefOrGetter<InsightsRange>) {
  const completionHistory = useLiveQuery(() => insightsService.listCompletionHistory(), [])
  const dailyPlans = useLiveQuery(() => insightsService.listDailyPlans(), [])
  const recurringInstances = useLiveQuery(() => recurrenceService.listAllInstances(), [])
  const { tasks } = useTasks()

  const rangeStart = computed(() => {
    switch (toValue(range)) {
      case 'week':
        return dateOffsetIso(-6)
      case 'month':
        return dateOffsetIso(-29)
      default:
        return EARLIEST_SENTINEL
    }
  })
  const rangeEnd = computed(() => todayIso())

  function inRange(dateIso: string): boolean {
    return dateIso >= rangeStart.value && dateIso <= rangeEnd.value
  }

  // --- Tasks completed / completion rate ---
  // Both sourced from completionHistory (an append-only snapshot), never
  // a live count of status === 'done' — that's the whole reason
  // completionHistory exists: it stays accurate after a task is later
  // edited or deleted, which a live query over `tasks` could not.
  const completionsInRange = computed(() =>
    completionHistory.value.filter((entry) => inRange(localIso(new Date(entry.completedAt)))),
  )
  const tasksCompleted = computed(() => completionsInRange.value.length)
  const openTasksCount = computed(() => tasks.value.filter((task) => task.status !== 'done').length)

  /**
   * Definition: completed-in-range / (completed-in-range + currently
   * open) — "of everything completed recently plus everything still on
   * your plate, what fraction is done." completionHistory has no
   * due-date snapshot, so this deliberately doesn't try to tie
   * completion rate to deadlines (that's more Calendar's territory);
   * "currently open" isn't itself range-filtered since an open task has
   * no "when" to filter by — it's either open right now or it isn't.
   */
  const completionRate = computed(() => {
    const denominator = tasksCompleted.value + openTasksCount.value
    return denominator === 0 ? 0 : Math.round((tasksCompleted.value / denominator) * 100)
  })

  // --- Workload over the range (Phase 6's summarizeWorkload, applied to
  // tasks due within the range instead of just "today") ---
  const tasksDueInRange = computed(() => tasks.value.filter((task) => task.dueDate && inRange(task.dueDate)))
  const workload = computed(() => summarizeWorkload(tasksDueInRange.value))

  // --- Recurring task completion — one combined figure across every
  // rule (not a per-rule breakdown), filtered by occurrenceDate ---
  const instancesInRange = computed(() =>
    recurringInstances.value.filter((instance) => inRange(instance.occurrenceDate)),
  )
  const recurringCompletion = computed(() => {
    const total = instancesInRange.value.length
    const completed = instancesInRange.value.filter((instance) => instance.status === 'completed').length
    return { total, completed, percent: total === 0 ? undefined : Math.round((completed / total) * 100) }
  })

  // --- Planning accuracy ---
  // Definition: of every task recommended across all DailyPlans in the
  // range, what fraction were actually completed on the day they were
  // planned for. Uses the `wasPlanned`/`planDate` fields taskService
  // stamps onto a CompletionHistoryEntry at completion time (checked
  // against *that day's* plan specifically) — completing a planned task
  // a day late doesn't count as "on plan", which is the point: it's a
  // real planning miss, not a rounding error. Aggregated as a single
  // ratio (sum of completed / sum of planned) across the range rather
  // than an average of daily percentages, which would let a single
  // small-plan day (e.g. 1 of 1 completed = 100%) skew the range figure
  // as much as a 20-task day.
  const plansInRange = computed(() => dailyPlans.value.filter((plan) => inRange(plan.date)))
  const planningAccuracy = computed(() => {
    const planned = plansInRange.value.reduce((sum, plan) => sum + plan.items.length, 0)
    const completed = completionHistory.value.filter(
      (entry) => entry.wasPlanned && entry.planDate && inRange(entry.planDate),
    ).length
    return { planned, completed, percent: planned === 0 ? undefined : Math.round((completed / planned) * 100) }
  })

  return {
    rangeStart,
    rangeEnd,
    tasksCompleted,
    openTasksCount,
    completionRate,
    workload,
    recurringCompletion,
    planningAccuracy,
  }
}

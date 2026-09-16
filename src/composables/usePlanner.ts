import { computed } from 'vue'

import type { Task } from '@/models'
import * as plannerService from '@/services/plannerService'
import { todayIso } from '@/utils/date'

import { useAvailability } from './useAvailability'
import { useLiveQuery } from './useLiveQuery'
import { useTasks } from './useTasks'

/**
 * Scoped to today only — Plan My Day (the only caller, from TodayView) has
 * no date picker, so a generic `date` parameter would be unused surface
 * area. If Calendar or Insights ever need to plan/inspect a different
 * date, that's the point to generalize this, not before.
 */
export function usePlanner() {
  const date = todayIso()

  const plan = useLiveQuery(() => plannerService.getPlan(date), undefined)
  const { tasks, todayTasks, overdueTasks } = useTasks()
  const { capacityFor } = useAvailability()

  // Plan My Day's candidate set, per the spec: today-flagged tasks plus
  // anything overdue (a task can be both; the Set dedupes).
  const candidateTasks = computed<Task[]>(() => {
    const ids = new Set<string>()
    for (const task of todayTasks.value) ids.add(task.id)
    for (const task of overdueTasks.value) ids.add(task.id)
    return tasks.value.filter((task) => ids.has(task.id))
  })

  const capacityMinutes = computed(() => capacityFor(date))
  const hasPlan = computed(() => !!plan.value)

  function taskById(id: string): Task | undefined {
    return tasks.value.find((task) => task.id === id)
  }

  const plannedTasks = computed<Task[]>(() =>
    plan.value
      ? [...plan.value.items]
          .sort((a, b) => a.order - b.order)
          .map((item) => taskById(item.taskId))
          .filter((task): task is Task => !!task)
      : [],
  )

  const overflowTasks = computed<Task[]>(() =>
    plan.value ? plan.value.overflowTaskIds.map((id) => taskById(id)).filter((task): task is Task => !!task) : [],
  )

  function plannedMinutesFor(items: PlanItemLike[]): number {
    return items.reduce((sum, item) => sum + (taskById(item.taskId)?.estimatedDuration ?? 0), 0)
  }

  /**
   * A no-op if today already has a plan — "Plan My Day" is safe to click
   * repeatedly and will never silently discard a manual adjustment.
   * regeneratePlan() is the one explicit, separate path that replaces an
   * existing plan (see PlanPanel.vue's confirm dialog before calling it).
   */
  async function generatePlan(): Promise<void> {
    if (plan.value) return
    const recommendation = plannerService.buildRecommendation(candidateTasks.value, capacityMinutes.value)
    await plannerService.savePlan(date, recommendation, capacityMinutes.value)
  }

  /** Explicit, destructive re-run — discards any manual adjustment. Callers must confirm first. */
  async function regeneratePlan(): Promise<void> {
    const recommendation = plannerService.buildRecommendation(candidateTasks.value, capacityMinutes.value)
    await plannerService.savePlan(date, recommendation, capacityMinutes.value)
  }

  async function moveToOverflow(taskId: string): Promise<void> {
    if (!plan.value) return
    const items = plan.value.items
      .filter((item) => item.taskId !== taskId)
      .map((item, index) => ({ taskId: item.taskId, order: index }))
    const overflowTaskIds = [...plan.value.overflowTaskIds, taskId]
    await plannerService.updatePlanItems(date, items, overflowTaskIds, plannedMinutesFor(items))
  }

  async function moveToPlanned(taskId: string): Promise<void> {
    if (!plan.value) return
    const overflowTaskIds = plan.value.overflowTaskIds.filter((id) => id !== taskId)
    const items = [...plan.value.items, { taskId, order: plan.value.items.length }]
    await plannerService.updatePlanItems(date, items, overflowTaskIds, plannedMinutesFor(items))
  }

  async function reorderPlanned(taskId: string, direction: 'up' | 'down'): Promise<void> {
    if (!plan.value) return
    const items = [...plan.value.items].sort((a, b) => a.order - b.order)
    const index = items.findIndex((item) => item.taskId === taskId)
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapWith < 0 || swapWith >= items.length) return
    ;[items[index], items[swapWith]] = [items[swapWith], items[index]]
    const reordered = items.map((item, i) => ({ taskId: item.taskId, order: i }))
    // Total minutes don't change on a pure reorder — reuse the stored value rather than recomputing.
    await plannerService.updatePlanItems(date, reordered, plan.value.overflowTaskIds, plan.value.plannedMinutes)
  }

  return {
    date,
    plan,
    hasPlan,
    candidateTasks,
    capacityMinutes,
    plannedTasks,
    overflowTasks,
    generatePlan,
    regeneratePlan,
    moveToOverflow,
    moveToPlanned,
    reorderPlanned,
  }
}

interface PlanItemLike {
  taskId: string
}

import { db } from '@/services/db'
import type { DailyPlan, PlanItem, Priority, Task } from '@/models'

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const NO_PRIORITY_RANK = 4

// Past any realistic due date, so a task with no deadline always sorts
// after every task that has one, using plain string comparison (dates are
// YYYY-MM-DD, so lexical and chronological order match).
const NO_DEADLINE_SENTINEL = '9999-12-31'

/** Priority -> deadline -> estimated duration, exactly the spec's waterfall — each level only breaks ties left by the one before it. */
function compareTasks(a: Task, b: Task): number {
  const priorityDiff = (a.priority ? PRIORITY_RANK[a.priority] : NO_PRIORITY_RANK) - (b.priority ? PRIORITY_RANK[b.priority] : NO_PRIORITY_RANK)
  if (priorityDiff !== 0) return priorityDiff

  const deadlineDiff = (a.dueDate ?? NO_DEADLINE_SENTINEL).localeCompare(b.dueDate ?? NO_DEADLINE_SENTINEL)
  if (deadlineDiff !== 0) return deadlineDiff

  return a.estimatedDuration - b.estimatedDuration
}

export interface PlanRecommendation {
  items: PlanItem[]
  overflowTaskIds: string[]
  plannedMinutes: number
}

/**
 * Pure: sorts candidates by the spec's waterfall and greedily packs them
 * into `capacityMinutes` in that order. This is NOT a bin-packing
 * optimization (a shorter low-priority task never jumps ahead of a longer
 * urgent one just because it "fits better") — the ordering itself is the
 * recommendation; capacity is just where the cutoff falls. Whatever
 * doesn't fit becomes overflow, never dropped. An overloaded day (capacity
 * too small for everything) is a valid result, not an error — it just
 * means more of the sorted list ends up in overflow.
 */
export function buildRecommendation(candidates: Task[], capacityMinutes: number): PlanRecommendation {
  const sorted = [...candidates].sort(compareTasks)
  const items: PlanItem[] = []
  const overflowTaskIds: string[] = []
  let plannedMinutes = 0

  for (const task of sorted) {
    if (plannedMinutes + task.estimatedDuration <= capacityMinutes) {
      items.push({ taskId: task.id, order: items.length })
      plannedMinutes += task.estimatedDuration
    } else {
      overflowTaskIds.push(task.id)
    }
  }

  return { items, overflowTaskIds, plannedMinutes }
}

export function getPlan(date: string): Promise<DailyPlan | undefined> {
  return db.dailyPlans.get(date)
}

/** Full (re)generation — the only place `generatedAt` is refreshed, since this is the only path where the algorithm actually re-ran. */
export async function savePlan(date: string, recommendation: PlanRecommendation, capacityMinutes: number): Promise<DailyPlan> {
  const plan: DailyPlan = {
    date,
    items: recommendation.items,
    overflowTaskIds: recommendation.overflowTaskIds,
    capacityMinutes,
    plannedMinutes: recommendation.plannedMinutes,
    generatedAt: new Date().toISOString(),
  }
  await db.dailyPlans.put(plan)
  return plan
}

/** Manual adjustment (move between planned/overflow, or reorder) — leaves `generatedAt` untouched. */
export async function updatePlanItems(
  date: string,
  items: PlanItem[],
  overflowTaskIds: string[],
  plannedMinutes: number,
): Promise<void> {
  await db.dailyPlans.update(date, { items, overflowTaskIds, plannedMinutes })
}

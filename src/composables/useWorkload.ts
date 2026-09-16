import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import type { Task } from '@/models'

export interface WorkloadSummary {
  count: number
  totalMinutes: number
}

/**
 * Pure — takes a plain Task[] rather than reading useTasks() itself, so
 * it works for any slice (today's tasks, a day's plan, a project) without
 * needing its own variant per caller. Insights (Phase 11) is expected to
 * reuse this directly rather than re-deriving the same sum.
 */
export function summarizeWorkload(tasks: Task[]): WorkloadSummary {
  return {
    count: tasks.length,
    totalMinutes: tasks.reduce((sum, task) => sum + task.estimatedDuration, 0),
  }
}

export function useWorkload(tasks: MaybeRefOrGetter<Task[]>) {
  const summary = computed(() => summarizeWorkload(toValue(tasks)))
  return { summary }
}

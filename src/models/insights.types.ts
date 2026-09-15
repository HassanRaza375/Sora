import type { Priority } from './task.types'

export interface CompletionHistoryEntry {
  id: string
  taskId: string
  projectId?: string
  /** Snapshot of the task at completion time, so edits/deletes later don't skew history. */
  title: string
  priority?: Priority
  estimatedDuration: number
  completedAt: string
  wasPlanned: boolean
  /** Date of the DailyPlan this completion was planned under, if any. */
  planDate?: string
}

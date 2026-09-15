export type Priority = 'urgent' | 'high' | 'medium' | 'low'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  /** Minutes. Required by the spec even when the user hasn't estimated carefully. */
  estimatedDuration: number
  projectId?: string
  priority?: Priority
  /** YYYY-MM-DD */
  dueDate?: string
  /** HH:mm */
  dueTime?: string
  today: boolean
  /** Set when this task was generated from a RecurringRule. */
  recurringRuleId?: string
  notes?: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
  order: number
}

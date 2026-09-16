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
  /**
   * True only for a row created by taskService.createDraftTask() (the task
   * drawer's "new task" flow). Never cleared once set, even after a title
   * is typed — combined with an empty title, it's how an abandoned draft
   * is told apart from a real task, at the moment the drawer closes.
   */
  createdViaDraft: boolean
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

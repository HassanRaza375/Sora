import type { Priority, Task } from './task.types'

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'specificWeekdays'
  | 'interval'
  | 'monthly'
  | 'yearly'

export interface RecurringRule {
  id: string
  frequency: RecurrenceFrequency
  /** For "interval" frequency: every N days/weeks. */
  interval?: number
  /** For "specificWeekdays": 0 (Sun) - 6 (Sat). */
  weekdaysMask?: number[]
  /** For "monthly"/"yearly". */
  dayOfMonth?: number
  /** For "yearly": 0-11. */
  month?: number
  startDate: string
  /** Undefined means the rule never ends. */
  endDate?: string
  active: boolean
  taskTemplate: Pick<Task, 'title' | 'projectId' | 'priority' | 'estimatedDuration' | 'notes'> & {
    priority?: Priority
  }
}

export type RecurringInstanceStatus = 'pending' | 'completed' | 'skipped'

export interface RecurringInstance {
  id: string
  ruleId: string
  taskId: string
  /** YYYY-MM-DD */
  occurrenceDate: string
  status: RecurringInstanceStatus
}

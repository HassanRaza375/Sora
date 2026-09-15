import Dexie, { type Table } from 'dexie'

import type {
  AvailabilitySchedule,
  CompletionHistoryEntry,
  DailyPlan,
  Project,
  RecurringInstance,
  RecurringRule,
  Reminder,
  Subtask,
  Task,
  UnavailablePeriod,
} from '@/models'

export class SoraDB extends Dexie {
  tasks!: Table<Task, string>
  subtasks!: Table<Subtask, string>
  projects!: Table<Project, string>
  recurringRules!: Table<RecurringRule, string>
  recurringInstances!: Table<RecurringInstance, string>
  dailyPlans!: Table<DailyPlan, string>
  availabilitySchedules!: Table<AvailabilitySchedule, number>
  unavailablePeriods!: Table<UnavailablePeriod, string>
  completionHistory!: Table<CompletionHistoryEntry, string>
  reminders!: Table<Reminder, string>

  constructor() {
    super('sora')

    this.version(1).stores({
      tasks: 'id, projectId, status, priority, dueDate, today, recurringRuleId, createdAt',
      subtasks: 'id, taskId, [taskId+order]',
      projects: 'id, archived, createdAt',
      recurringRules: 'id, active, frequency',
      recurringInstances: 'id, ruleId, taskId, occurrenceDate, status',
      dailyPlans: 'date',
      availabilitySchedules: 'weekday',
      unavailablePeriods: 'id, startDate, endDate',
      completionHistory: 'id, taskId, projectId, completedAt',
      reminders: 'id, taskId, triggerAt, status',
    })
  }
}

export const db = new SoraDB()

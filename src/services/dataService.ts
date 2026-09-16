import { db } from '@/services/db'
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

// Every table added since Phase 0 — kept as one explicit list so a table
// added by a future phase has to be deliberately added here too, rather
// than silently missing from export/clear/import.
const ALL_TABLES = [
  db.tasks,
  db.subtasks,
  db.projects,
  db.recurringRules,
  db.recurringInstances,
  db.dailyPlans,
  db.availabilitySchedules,
  db.unavailablePeriods,
  db.completionHistory,
  db.reminders,
]

export interface ExportedData {
  version: 1
  exportedAt: string
  tables: {
    tasks: Task[]
    subtasks: Subtask[]
    projects: Project[]
    recurringRules: RecurringRule[]
    recurringInstances: RecurringInstance[]
    dailyPlans: DailyPlan[]
    availabilitySchedules: AvailabilitySchedule[]
    unavailablePeriods: UnavailablePeriod[]
    completionHistory: CompletionHistoryEntry[]
    reminders: Reminder[]
  }
}

/**
 * Doubles as this app's "Backup" — there's no server in this
 * architecture to back up to, so a downloadable export of every table
 * *is* the backup, not a separate feature under a different label. See
 * DataSettings.vue's copy, which says so explicitly rather than
 * building two near-identical buttons.
 */
export async function exportAllData(): Promise<ExportedData> {
  // Called individually (not `Promise.all(ALL_TABLES.map(t => t.toArray()))`)
  // so each result keeps its own table's type — mapping over the
  // heterogeneous `ALL_TABLES` array collapses everything to a union type
  // TypeScript can no longer destructure back into distinct fields.
  const [
    tasks,
    subtasks,
    projects,
    recurringRules,
    recurringInstances,
    dailyPlans,
    availabilitySchedules,
    unavailablePeriods,
    completionHistory,
    reminders,
  ] = await Promise.all([
    db.tasks.toArray(),
    db.subtasks.toArray(),
    db.projects.toArray(),
    db.recurringRules.toArray(),
    db.recurringInstances.toArray(),
    db.dailyPlans.toArray(),
    db.availabilitySchedules.toArray(),
    db.unavailablePeriods.toArray(),
    db.completionHistory.toArray(),
    db.reminders.toArray(),
  ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      tasks,
      subtasks,
      projects,
      recurringRules,
      recurringInstances,
      dailyPlans,
      availabilitySchedules,
      unavailablePeriods,
      completionHistory,
      reminders,
    },
  }
}

async function clearAllTables(): Promise<void> {
  await Promise.all(ALL_TABLES.map((table) => table.clear()))
}

/** Full wipe, every table including completionHistory — a "reset" that preserved analytics history wouldn't be a real reset. Irreversible; callers must confirm first. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', ALL_TABLES, clearAllTables)
}

/**
 * Destructive replace, not a merge: clears every table inside the same
 * transaction as the bulk-insert (one atomic operation — either the
 * whole import lands or none of it does), then restores exactly what's
 * in the file. A merge was considered and rejected — this data model has
 * real cross-table references (RecurringInstance -> RecurringRule/Task,
 * DailyPlan -> Task ids, Reminder -> Task), and merging two independently
 * -evolved datasets could easily produce dangling references or
 * duplicate-derived state (e.g. two rules generating overlapping
 * instances) with no clean resolution. Import is for restoring a backup
 * or moving to a new device, not combining two histories.
 */
export async function importAllData(data: ExportedData): Promise<void> {
  await db.transaction('rw', ALL_TABLES, async () => {
    await clearAllTables()
    await Promise.all([
      db.tasks.bulkAdd(data.tables.tasks),
      db.subtasks.bulkAdd(data.tables.subtasks),
      db.projects.bulkAdd(data.tables.projects),
      db.recurringRules.bulkAdd(data.tables.recurringRules),
      db.recurringInstances.bulkAdd(data.tables.recurringInstances),
      db.dailyPlans.bulkAdd(data.tables.dailyPlans),
      db.availabilitySchedules.bulkAdd(data.tables.availabilitySchedules),
      db.unavailablePeriods.bulkAdd(data.tables.unavailablePeriods),
      db.completionHistory.bulkAdd(data.tables.completionHistory),
      db.reminders.bulkAdd(data.tables.reminders),
    ])
  })
}

import { db } from '@/services/db'
import * as taskService from '@/services/taskService'
import type { RecurrenceFrequency, RecurringInstance, RecurringRule } from '@/models'
import { createId } from '@/utils/id'
import { dateOffsetIso, parseLocalDate, localIso, todayIso } from '@/utils/date'

// How far ahead instances are kept generated, from "today" at the moment
// generation runs. Deliberately NOT unbounded — a `daily` rule with no
// `endDate` would otherwise generate forever. 30 days is enough runway that
// a user opening the app at least monthly never sees a gap, without
// creating hundreds of far-future rows for a long-lived daily rule.
const GENERATION_WINDOW_DAYS = 30

export function listRules(): Promise<RecurringRule[]> {
  return db.recurringRules.toArray()
}

export function getRule(id: string): Promise<RecurringRule | undefined> {
  return db.recurringRules.get(id)
}

export function listInstancesForRule(ruleId: string): Promise<RecurringInstance[]> {
  return db.recurringInstances.where('ruleId').equals(ruleId).toArray()
}

/** Every instance across every rule — Insights (Phase 11) reports one combined "recurring task completion" figure rather than per-rule breakdowns. */
export function listAllInstances(): Promise<RecurringInstance[]> {
  return db.recurringInstances.toArray()
}

export interface RulePatternInput {
  frequency: RecurrenceFrequency
  interval?: number
  weekdaysMask?: number[]
  dayOfMonth?: number
  month?: number
}

/**
 * Creates a rule anchored to `taskId`'s current due date (or today, if it
 * has none — a recurring task needs a start date to anchor its pattern to,
 * so this also sets the task's own `dueDate` if it was empty). The task
 * being edited becomes the rule's first occurrence: it's linked via a
 * RecurringInstance for that date rather than being duplicated, so
 * generateInstancesForRule's idempotency check naturally skips
 * re-creating a task for that same date and only backfills the rest of
 * the window.
 */
export async function createRuleForTask(taskId: string, pattern: RulePatternInput): Promise<RecurringRule> {
  const task = await db.tasks.get(taskId)
  if (!task) throw new Error(`createRuleForTask: task ${taskId} not found`)

  const startDate = task.dueDate ?? todayIso()

  const rule: RecurringRule = {
    id: createId(),
    frequency: pattern.frequency,
    interval: pattern.interval,
    weekdaysMask: pattern.weekdaysMask,
    dayOfMonth: pattern.dayOfMonth,
    month: pattern.month,
    startDate,
    active: true,
    taskTemplate: {
      title: task.title,
      projectId: task.projectId,
      priority: task.priority,
      estimatedDuration: task.estimatedDuration,
      notes: task.notes,
    },
  }
  await db.recurringRules.add(rule)

  const instance: RecurringInstance = {
    id: createId(),
    ruleId: rule.id,
    taskId,
    occurrenceDate: startDate,
    status: task.status === 'done' ? 'completed' : 'pending',
  }
  await db.recurringInstances.add(instance)
  await db.tasks.update(taskId, { recurringRuleId: rule.id, dueDate: startDate, updatedAt: new Date().toISOString() })

  await generateInstancesForRule(rule.id)
  return rule
}

/**
 * Updates the pattern fields (and, if `syncTemplateFromTaskId` is given,
 * re-snapshots the taskTemplate from that task's current fields) then
 * immediately tops up generation under the new pattern. This never
 * touches instances already generated under the old pattern — past
 * generation is never retroactively corrected or deleted, consistent
 * with "never silently reschedules".
 */
export async function updateRulePattern(
  ruleId: string,
  pattern: RulePatternInput,
  syncTemplateFromTaskId?: string,
): Promise<void> {
  const patch: Partial<RecurringRule> = { ...pattern }

  if (syncTemplateFromTaskId) {
    const task = await db.tasks.get(syncTemplateFromTaskId)
    if (task) {
      patch.taskTemplate = {
        title: task.title,
        projectId: task.projectId,
        priority: task.priority,
        estimatedDuration: task.estimatedDuration,
        notes: task.notes,
      }
    }
  }

  await db.recurringRules.update(ruleId, patch)
  await generateInstancesForRule(ruleId)
}

/** Pausing (or "ending") a rule — never deletes its instances or the completion history they reference; only stops future generation. */
export async function setRuleActive(ruleId: string, active: boolean): Promise<void> {
  await db.recurringRules.update(ruleId, { active })
}

/**
 * Which dates in [windowStart, windowEnd] this rule's pattern lands on,
 * clamped to the rule's own [startDate, endDate]. Pure — no Dexie access.
 *
 * `weekly` and `interval` step forward from `rule.startDate` (not from
 * `windowStart`) so the cadence stays phase-locked to the rule's actual
 * anchor date across repeated calls with different windows — starting the
 * step from `windowStart` instead would let the phase silently drift
 * every time the window moves. `daily`/`weekdays`/`specificWeekdays` have
 * no phase to preserve (every day, or every day of a given weekday, means
 * the same thing regardless of scan start), so they start directly at
 * the clamped window for efficiency.
 */
export function occurrencesInWindow(rule: RecurringRule, windowStart: string, windowEnd: string): string[] {
  const effectiveStart = rule.startDate > windowStart ? rule.startDate : windowStart
  const effectiveEnd = rule.endDate && rule.endDate < windowEnd ? rule.endDate : windowEnd
  if (effectiveStart > effectiveEnd) return []

  const dates: string[] = []

  switch (rule.frequency) {
    case 'daily': {
      for (const cursor = parseLocalDate(effectiveStart); localIso(cursor) <= effectiveEnd; cursor.setDate(cursor.getDate() + 1)) {
        dates.push(localIso(cursor))
      }
      break
    }
    case 'weekdays': {
      for (const cursor = parseLocalDate(effectiveStart); localIso(cursor) <= effectiveEnd; cursor.setDate(cursor.getDate() + 1)) {
        const day = cursor.getDay()
        if (day !== 0 && day !== 6) dates.push(localIso(cursor))
      }
      break
    }
    case 'specificWeekdays': {
      const mask = new Set(rule.weekdaysMask ?? [])
      for (const cursor = parseLocalDate(effectiveStart); localIso(cursor) <= effectiveEnd; cursor.setDate(cursor.getDate() + 1)) {
        if (mask.has(cursor.getDay())) dates.push(localIso(cursor))
      }
      break
    }
    case 'weekly': {
      for (const cursor = parseLocalDate(rule.startDate); localIso(cursor) <= effectiveEnd; cursor.setDate(cursor.getDate() + 7)) {
        const iso = localIso(cursor)
        if (iso >= effectiveStart) dates.push(iso)
      }
      break
    }
    case 'interval': {
      const step = rule.interval && rule.interval > 0 ? rule.interval : 1
      for (const cursor = parseLocalDate(rule.startDate); localIso(cursor) <= effectiveEnd; cursor.setDate(cursor.getDate() + step)) {
        const iso = localIso(cursor)
        if (iso >= effectiveStart) dates.push(iso)
      }
      break
    }
    case 'monthly': {
      const day = rule.dayOfMonth ?? 1
      let [year, month] = effectiveStart.split('-').map(Number)
      const [endYear, endMonth] = effectiveEnd.split('-').map(Number)
      while (year < endYear || (year === endYear && month <= endMonth)) {
        const daysInMonth = new Date(year, month, 0).getDate()
        if (day <= daysInMonth) {
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          if (iso >= effectiveStart && iso <= effectiveEnd) dates.push(iso)
        }
        month += 1
        if (month > 12) {
          month = 1
          year += 1
        }
      }
      break
    }
    case 'yearly': {
      const day = rule.dayOfMonth ?? 1
      const month = (rule.month ?? 0) + 1
      let year = Number(effectiveStart.slice(0, 4))
      const endYear = Number(effectiveEnd.slice(0, 4))
      while (year <= endYear) {
        const daysInMonth = new Date(year, month, 0).getDate()
        if (day <= daysInMonth) {
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          if (iso >= effectiveStart && iso <= effectiveEnd) dates.push(iso)
        }
        year += 1
      }
      break
    }
  }

  return dates
}

/**
 * Idempotent: computes this rule's occurrence dates for the rolling
 * window, skips any date that already has a RecurringInstance, and
 * creates ordinary Task + RecurringInstance rows for the rest. Paused
 * (`active: false`) rules generate nothing. Returns the count actually
 * created, so callers (and Playwright) can assert on it.
 *
 * Deliberately does NOT backfill dates before "today" even if they were
 * never generated (e.g. the app wasn't opened for a while) — the window
 * is always [today, today + GENERATION_WINDOW_DAYS], so a gap in the past
 * is simply never filled. Retroactively generating a pile of now-overdue
 * instances for days the user wasn't even here for would flood Inbox/
 * Overdue with backlog nobody asked for; recurrence should only ever
 * project forward from "now".
 */
export async function generateInstancesForRule(ruleId: string): Promise<number> {
  const rule = await db.recurringRules.get(ruleId)
  if (!rule || !rule.active) return 0

  const windowStart = todayIso()
  const windowEnd = dateOffsetIso(GENERATION_WINDOW_DAYS)
  const occurrenceDates = occurrencesInWindow(rule, windowStart, windowEnd)
  if (occurrenceDates.length === 0) return 0

  const existing = await db.recurringInstances.where('ruleId').equals(ruleId).toArray()
  const existingDates = new Set(existing.map((instance) => instance.occurrenceDate))
  const newDates = occurrenceDates.filter((date) => !existingDates.has(date))

  for (const date of newDates) {
    const task = await taskService.createTask({
      title: rule.taskTemplate.title,
      projectId: rule.taskTemplate.projectId,
      priority: rule.taskTemplate.priority,
      estimatedDuration: rule.taskTemplate.estimatedDuration,
      notes: rule.taskTemplate.notes,
      dueDate: date,
      recurringRuleId: ruleId,
    })
    await db.recurringInstances.add({
      id: createId(),
      ruleId,
      taskId: task.id,
      occurrenceDate: date,
      status: 'pending',
    })
  }

  return newDates.length
}

/**
 * The lazy top-up path (see CLAUDE.md's "Recurring tasks" section for the
 * eager-vs-lazy reasoning) — called once from App.vue on mount. Reads
 * every rule and filters `active` in JS rather than
 * `db.recurringRules.where('active').equals(true)`: IndexedDB's key spec
 * doesn't accept a plain boolean as an index key, so a boolean-valued
 * `.where().equals()` lookup can't be relied on — same reason `today` is
 * never queried that way in taskService either. Rule count is small
 * enough that an in-memory filter over `toArray()` costs nothing.
 */
export async function ensureWindowTopUp(): Promise<number> {
  const rules = await db.recurringRules.toArray()
  const activeRules = rules.filter((rule) => rule.active)

  let generated = 0
  for (const rule of activeRules) {
    generated += await generateInstancesForRule(rule.id)
  }
  return generated
}

import { db } from '@/services/db'
import type { Reminder, ReminderOffset } from '@/models'
import { createId } from '@/utils/id'

const OFFSET_MINUTES: Record<Exclude<ReminderOffset, 'custom'>, number> = {
  due: 0,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '1d': 60 * 24,
}

/**
 * Absolute fire time for a preset offset, computed once from the task's
 * due date + time. `new Date(`${dueDate}T${dueTime}`)` — unlike a
 * date-only string — parses as LOCAL time per the `Date` constructor's
 * own spec (only a date-only ISO string is UTC), so this doesn't need
 * `date.ts`'s local-parsing workarounds.
 */
export function computePresetTriggerAt(dueDate: string, dueTime: string, offset: Exclude<ReminderOffset, 'custom'>): string {
  const due = new Date(`${dueDate}T${dueTime}`)
  return new Date(due.getTime() - OFFSET_MINUTES[offset] * 60_000).toISOString()
}

export function listReminders(): Promise<Reminder[]> {
  return db.reminders.toArray()
}

/** Every reminder that might still fire — the scheduler's working set. */
export async function listActiveReminders(): Promise<Reminder[]> {
  const all = await db.reminders.toArray()
  return all.filter((reminder) => reminder.status === 'pending' || reminder.status === 'snoozed')
}

export function getReminderForTask(taskId: string): Promise<Reminder | undefined> {
  return db.reminders.where('taskId').equals(taskId).first()
}

export interface ReminderPatternInput {
  offsetType: ReminderOffset
  /** Required (and only read) for offsetType 'custom' — an absolute ISO instant the caller already resolved from its own datetime input. */
  customTriggerAt?: string
}

/**
 * One reminder per task — a second call replaces the first *in place*
 * (same id), rather than the app supporting a list of reminders per
 * task. Mirrors `recurrenceService`'s create/update split, collapsed
 * into one function since there's no "first instance" concept to carry
 * over here. Returns `undefined` (and writes nothing) if the inputs
 * can't resolve to a concrete trigger time — e.g. a preset offset
 * without both `dueDate` and `dueTime` set on the task yet.
 */
export async function upsertReminderForTask(
  taskId: string,
  input: ReminderPatternInput,
  dueDate: string | undefined,
  dueTime: string | undefined,
): Promise<Reminder | undefined> {
  const triggerAt =
    input.offsetType === 'custom'
      ? input.customTriggerAt
      : dueDate && dueTime
        ? computePresetTriggerAt(dueDate, dueTime, input.offsetType)
        : undefined
  if (!triggerAt) return undefined

  const existing = await getReminderForTask(taskId)
  if (existing) {
    await db.reminders.update(existing.id, {
      offsetType: input.offsetType,
      triggerAt,
      status: 'pending',
      snoozedUntil: undefined,
    })
    return { ...existing, offsetType: input.offsetType, triggerAt, status: 'pending', snoozedUntil: undefined }
  }

  const reminder: Reminder = { id: createId(), taskId, triggerAt, offsetType: input.offsetType, status: 'pending' }
  await db.reminders.add(reminder)
  return reminder
}

export async function removeReminderForTask(taskId: string): Promise<void> {
  await db.reminders.where('taskId').equals(taskId).delete()
}

export async function markFired(id: string): Promise<void> {
  await db.reminders.update(id, { status: 'fired' })
}

export async function snoozeReminder(id: string, minutes: number): Promise<void> {
  const snoozedUntil = new Date(Date.now() + minutes * 60_000).toISOString()
  await db.reminders.update(id, { status: 'snoozed', snoozedUntil })
}

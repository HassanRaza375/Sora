import { db } from '@/services/db'
import type { AvailabilitySchedule, UnavailablePeriod } from '@/models'
import { createId } from '@/utils/id'
import { weekdayOf } from '@/utils/date'
import { parseTimeToMinutes } from '@/utils/duration'

// Weekdays with no explicit AvailabilitySchedule row fall back to this —
// a sensible Mon-Fri 9-5 default so Plan My Day produces something useful
// before the user ever visits Planning, rather than silently treating an
// unconfigured day as zero capacity. Nothing is written to Dexie for this;
// it's purely a computed fallback, and the Planning UI shows it as the
// pre-filled (but unsaved) starting point for a weekday it hasn't touched.
const WEEKEND_DAYS = new Set([0, 6])

export function defaultScheduleFor(weekday: number): AvailabilitySchedule {
  const isWeekend = WEEKEND_DAYS.has(weekday)
  return {
    weekday,
    workStart: isWeekend ? '00:00' : '09:00',
    workEnd: isWeekend ? '00:00' : '17:00',
    breaks: [],
  }
}

export function scheduleForWeekday(weekday: number, schedules: AvailabilitySchedule[]): AvailabilitySchedule {
  return schedules.find((schedule) => schedule.weekday === weekday) ?? defaultScheduleFor(weekday)
}

export function isDateUnavailable(dateIso: string, periods: UnavailablePeriod[]): boolean {
  return periods.some((period) => dateIso >= period.startDate && dateIso <= period.endDate)
}

/**
 * Working hours minus break time minus a full-day block from any
 * overlapping UnavailablePeriod. UnavailablePeriod has no time-of-day
 * fields on the model, so it always blocks the entire date rather than a
 * partial-day chunk — `allDay` exists on the model for a possible future
 * partial-day extension but isn't read here.
 */
export function capacityMinutesForDate(
  dateIso: string,
  schedules: AvailabilitySchedule[],
  periods: UnavailablePeriod[],
): number {
  if (isDateUnavailable(dateIso, periods)) return 0
  const schedule = scheduleForWeekday(weekdayOf(dateIso), schedules)
  const workMinutes = Math.max(0, parseTimeToMinutes(schedule.workEnd) - parseTimeToMinutes(schedule.workStart))
  const breakMinutes = schedule.breaks.reduce(
    (sum, brk) => sum + Math.max(0, parseTimeToMinutes(brk.end) - parseTimeToMinutes(brk.start)),
    0,
  )
  return Math.max(0, workMinutes - breakMinutes)
}

export function listSchedules(): Promise<AvailabilitySchedule[]> {
  return db.availabilitySchedules.toArray()
}

export type SchedulePatch = Partial<Pick<AvailabilitySchedule, 'workStart' | 'workEnd' | 'breaks'>>

/** Keyed by weekday, so this always creates-or-replaces the one row for that weekday (no separate create/update split needed). */
export async function upsertSchedule(weekday: number, patch: SchedulePatch): Promise<void> {
  const existing = await db.availabilitySchedules.get(weekday)
  const base = existing ?? defaultScheduleFor(weekday)
  await db.availabilitySchedules.put({ ...base, ...patch, weekday })
}

export function listUnavailablePeriods(): Promise<UnavailablePeriod[]> {
  return db.unavailablePeriods.orderBy('startDate').toArray()
}

export interface NewUnavailablePeriodInput {
  startDate: string
  endDate: string
  label?: string
}

export async function createUnavailablePeriod(input: NewUnavailablePeriodInput): Promise<UnavailablePeriod> {
  const period: UnavailablePeriod = {
    id: createId(),
    startDate: input.startDate,
    endDate: input.endDate,
    label: input.label,
    allDay: true,
  }
  await db.unavailablePeriods.add(period)
  return period
}

export async function deleteUnavailablePeriod(id: string): Promise<void> {
  await db.unavailablePeriods.delete(id)
}

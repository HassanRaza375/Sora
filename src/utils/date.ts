/**
 * `Date#toISOString()` is UTC-based, so `.slice(0, 10)` on it can land on
 * the wrong calendar day near midnight for anyone not in UTC (e.g. 2am in
 * UTC+10 is still the previous day in UTC). These use the Date object's
 * local getters instead, so the YYYY-MM-DD string always matches the
 * user's own local calendar day.
 */
export function localIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today, as YYYY-MM-DD in the user's local timezone. */
export function todayIso(): string {
  return localIso(new Date())
}

/** `days` days from today (negative for the past), as YYYY-MM-DD. */
export function dateOffsetIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localIso(date)
}

/** This month, as YYYY-MM in the user's local timezone. */
export function currentMonthIso(): string {
  return todayIso().slice(0, 7)
}

/** `months` months from the given YYYY-MM month (negative for the past), as YYYY-MM. */
export function monthOffsetIso(monthIso: string, months: number): string {
  const [year, month] = monthIso.split('-').map(Number)
  const date = new Date(year, month - 1 + months, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** First day of the given YYYY-MM month, as YYYY-MM-DD. */
export function monthStartIso(monthIso: string): string {
  return `${monthIso}-01`
}

/** Last day of the given YYYY-MM month, as YYYY-MM-DD. */
export function monthEndIso(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return `${monthIso}-${String(lastDay).padStart(2, '0')}`
}

/**
 * Parses a YYYY-MM-DD string into a local `Date` from its y/m/d parts
 * (`new Date(year, month, day)`) rather than `new Date(dateIso)` —
 * passing a date-only ISO string to the `Date` constructor parses it as
 * UTC midnight, which can land on the wrong local day/weekday near
 * midnight in a timezone behind UTC (the same class of bug `localIso`/
 * `todayIso` fix for the reverse direction).
 */
export function parseLocalDate(dateIso: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** 0 (Sun) - 6 (Sat) for a YYYY-MM-DD string. */
export function weekdayOf(dateIso: string): number {
  return parseLocalDate(dateIso).getDay()
}

/**
 * An absolute ISO instant (e.g. `Reminder.triggerAt`) as a local
 * `YYYY-MM-DDTHH:mm` string, suitable for `<input type="datetime-local">`'s
 * `value`. Uses the `Date` object's local getters, same reasoning as
 * `localIso` — the input's own value is implicitly local time (no
 * timezone suffix), so round-tripping through UTC getters here would
 * shift it.
 */
export function isoToDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

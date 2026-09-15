export interface TimeRange {
  /** HH:mm */
  start: string
  /** HH:mm */
  end: string
}

export interface AvailabilitySchedule {
  /** 0 (Sun) - 6 (Sat), primary key. */
  weekday: number
  workStart: string
  workEnd: string
  breaks: TimeRange[]
}

export interface UnavailablePeriod {
  id: string
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD */
  endDate: string
  label?: string
  allDay: boolean
}

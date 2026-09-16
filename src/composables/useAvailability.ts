import { computed } from 'vue'

import * as availabilityService from '@/services/availabilityService'
import { todayIso } from '@/utils/date'

import { useLiveQuery } from './useLiveQuery'

export function useAvailability() {
  const schedules = useLiveQuery(() => availabilityService.listSchedules(), [])
  const unavailablePeriods = useLiveQuery(() => availabilityService.listUnavailablePeriods(), [])

  function scheduleFor(weekday: number) {
    return availabilityService.scheduleForWeekday(weekday, schedules.value)
  }

  /** Available minutes for a given YYYY-MM-DD date — working hours minus breaks minus any overlapping unavailable period. */
  function capacityFor(dateIso: string): number {
    return availabilityService.capacityMinutesForDate(dateIso, schedules.value, unavailablePeriods.value)
  }

  const todayCapacityMinutes = computed(() => capacityFor(todayIso()))

  return {
    schedules,
    unavailablePeriods,
    scheduleFor,
    capacityFor,
    todayCapacityMinutes,
    upsertSchedule: availabilityService.upsertSchedule,
    createUnavailablePeriod: availabilityService.createUnavailablePeriod,
    deleteUnavailablePeriod: availabilityService.deleteUnavailablePeriod,
  }
}

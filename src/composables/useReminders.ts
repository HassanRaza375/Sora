import { toValue, type MaybeRefOrGetter } from 'vue'

import * as reminderService from '@/services/reminderService'

import { useLiveQuery } from './useLiveQuery'

/** The one reminder (if any) for a task, reactively keyed by a (possibly reactive/undefined) task id — mirrors useRecurringRule. */
export function useReminderForTask(taskId: MaybeRefOrGetter<string | undefined>) {
  const reminder = useLiveQuery(
    () => {
      const id = toValue(taskId)
      return id ? reminderService.getReminderForTask(id) : Promise.resolve(undefined)
    },
    undefined,
    () => toValue(taskId),
  )

  return { reminder }
}

export function useReminders() {
  return {
    upsertReminderForTask: reminderService.upsertReminderForTask,
    removeReminderForTask: reminderService.removeReminderForTask,
    snoozeReminder: reminderService.snoozeReminder,
  }
}

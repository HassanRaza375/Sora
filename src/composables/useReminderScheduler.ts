import { onScopeDispose } from 'vue'

import type { Reminder } from '@/models'
import * as reminderService from '@/services/reminderService'

import { notificationsCurrentlyEnabled } from './useNotificationsPreference'
import { useLiveQuery } from './useLiveQuery'
import { useTaskDrawer } from './useTaskDrawer'
import { useTasks } from './useTasks'

// Checked on a recurring interval rather than one setTimeout scheduled per
// reminder at its exact future fire time: a backgrounded/suspended tab can
// have long setTimeouts throttled or paused entirely by the browser
// (Chrome in particular clamps/suspends timers in inactive tabs), which
// would silently drop a reminder scheduled to fire while the tab was
// inactive. A short recurring check instead just compares "now" against
// every pending/snoozed reminder's fire time on each tick — if a tick
// itself gets throttled and skipped, the next one that does run still
// catches anything now overdue, so a reminder is delayed at worst, never
// silently lost. 30s is granular enough that no one perceives a reminder
// as late, without polling so often it's wasteful.
const CHECK_INTERVAL_MS = 30_000

export function useReminderScheduler() {
  const reminders = useLiveQuery(() => reminderService.listActiveReminders(), [])
  const { tasks } = useTasks()
  const { openTaskDrawer } = useTaskDrawer()

  function taskTitleFor(taskId: string): string {
    return tasks.value.find((task) => task.id === taskId)?.title || 'Task reminder'
  }

  async function fire(reminder: Reminder) {
    // Marked fired regardless of whether a visible Notification can
    // actually be shown — permission may be denied/unsupported (or the
    // user may have switched the Settings > Notifications toggle off),
    // and this reminder's moment has passed either way, so it shouldn't
    // keep matching on every future tick. See TaskDrawer.vue for where
    // permission is actually requested (only from the explicit "Set
    // reminder" action, never proactively here).
    await reminderService.markFired(reminder.id)

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !notificationsCurrentlyEnabled()) {
      return
    }

    const notification = new Notification(taskTitleFor(reminder.taskId), {
      body: 'Tap to open this task in Sora.',
      tag: reminder.id,
    })
    // No service worker (see CLAUDE.md's PWA constraint), so there's no
    // `notificationclick` handler and no `actions` array support either —
    // a plain page-created Notification only supports this one click
    // handler. Complete/snooze happen from the drawer once it's open, not
    // from action buttons on the notification itself.
    notification.onclick = () => {
      window.focus()
      void openTaskDrawer(reminder.taskId)
      notification.close()
    }
  }

  function checkDue() {
    const now = Date.now()
    for (const reminder of reminders.value) {
      const fireAt = reminder.status === 'snoozed' && reminder.snoozedUntil ? reminder.snoozedUntil : reminder.triggerAt
      if (new Date(fireAt).getTime() <= now) void fire(reminder)
    }
  }

  let intervalId: ReturnType<typeof setInterval> | undefined

  function start() {
    if (intervalId) return
    checkDue()
    intervalId = setInterval(checkDue, CHECK_INTERVAL_MS)
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  onScopeDispose(stop)

  return { start, stop }
}

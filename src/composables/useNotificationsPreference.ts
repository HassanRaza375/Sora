import { ref, watch } from 'vue'

const STORAGE_KEY = 'sora:notifications-enabled'

function readStored(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

// Module-level singleton, same reasoning as useTheme.ts — one shared
// value across every caller. Defaults to enabled: this gates whether a
// *fired* reminder shows a visible Notification (see
// useReminderScheduler.ts), it doesn't touch browser permission, which
// is a separate, unrelated axis (see NotificationsSettings.vue).
const notificationsEnabled = ref<boolean>(readStored())

watch(notificationsEnabled, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Ignore — see useTheme.ts's identical note.
  }
})

export function useNotificationsPreference() {
  function setEnabled(value: boolean) {
    notificationsEnabled.value = value
  }
  return { notificationsEnabled, setEnabled }
}

/** Plain (non-reactive) read for non-component code — useReminderScheduler.ts's fire() isn't itself a component. */
export function notificationsCurrentlyEnabled(): boolean {
  return notificationsEnabled.value
}

<script setup lang="ts">
import { onMounted } from 'vue'

import AppShell from '@/components/layout/AppShell.vue'
import { useReminderScheduler } from '@/composables/useReminderScheduler'
import { useTheme } from '@/composables/useTheme'
import { ensureWindowTopUp } from '@/services/recurrenceService'

// useTheme.ts applies the stored/system theme at module-import time
// already (see its own comment) — calling it here isn't what makes the
// class apply, it's just how this component gets a reactive `theme` ref
// if it ever needs one. Importing the module (which happens regardless,
// transitively, once any Settings-adjacent code is reached) is what
// matters for the early class-application timing.
useTheme()

// Called here (not inside onMounted) since it's a composable — it needs
// App.vue's active component scope for its useLiveQuery subscriptions and
// onScopeDispose cleanup to attach to.
const reminderScheduler = useReminderScheduler()

// Lazy top-up: this is an offline-first PWA with no backend, so nothing
// can generate future recurring instances while the app isn't open. Every
// active rule's rolling window is topped up once per app load rather than
// on a timer — cheap (idempotent, skips dates already generated) and
// sufficient, since a gap only matters the next time someone's actually
// looking at the app. Rule creation/edits (recurrenceService.ts) also
// generate eagerly on the spot, so this mainly covers "app wasn't opened
// in a while."
//
// The reminder scheduler starts here too — foreground-only per CLAUDE.md's
// explicit no-service-worker-push constraint, so it only ever runs while
// this component tree is mounted (see useReminderScheduler.ts for the
// polling-interval reasoning).
onMounted(() => {
  void ensureWindowTopUp()
  reminderScheduler.start()
})
</script>

<template>
  <AppShell />
</template>

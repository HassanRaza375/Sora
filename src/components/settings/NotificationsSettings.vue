<script setup lang="ts">
import { computed, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useNotificationsPreference } from '@/composables/useNotificationsPreference'

const { notificationsEnabled, setEnabled } = useNotificationsPreference()

function onToggle(value: boolean | 'indeterminate') {
  setEnabled(value === true)
}

// `Notification.permission` itself isn't reactive — re-read on demand
// (on mount, and after a request resolves) rather than polling it.
const supported = typeof Notification !== 'undefined'
const permission = ref<NotificationPermission>(supported ? Notification.permission : 'denied')

async function handleRequestPermission() {
  if (!supported || permission.value !== 'default') return
  permission.value = await Notification.requestPermission()
}

const permissionLabel = computed(() => {
  if (!supported) return 'Not supported in this browser'
  if (permission.value === 'granted') return 'Allowed'
  if (permission.value === 'denied') return 'Blocked'
  return 'Not yet requested'
})
</script>

<template>
  <section class="flex flex-col gap-6">
    <div>
      <h2 class="text-meta text-muted-foreground font-medium">Notifications</h2>
      <p class="text-caption text-muted-foreground">
        Reminders (due time, N minutes/hours before, custom) are set per task from its drawer — this page controls
        whether they're allowed to show up visibly.
      </p>
    </div>

    <div class="flex items-start gap-2">
      <Checkbox id="notif-enabled" class="mt-0.5" :model-value="notificationsEnabled" @update:model-value="onToggle" />
      <div class="flex flex-col gap-0.5">
        <Label for="notif-enabled">Show browser notifications for reminders</Label>
        <p class="text-caption text-muted-foreground">
          Turning this off doesn't delete or pause your reminders — they still save and still mark themselves fired
          at the right time, they just won't pop up a visible notification while this is off.
        </p>
      </div>
    </div>

    <div class="border-border bg-card flex items-center justify-between rounded-lg border p-4">
      <div>
        <p class="text-body">Browser permission</p>
        <p class="text-caption text-muted-foreground">{{ permissionLabel }}</p>
      </div>
      <Button v-if="permission === 'default'" size="sm" @click="handleRequestPermission">Enable</Button>
    </div>

    <p v-if="permission === 'denied'" class="text-caption text-muted-foreground">
      Notifications are blocked at the browser level for this site. The browser deliberately won't let a page
      re-prompt once you've denied it — re-enable it from your browser's own site settings for this page, then
      reload.
    </p>
  </section>
</template>

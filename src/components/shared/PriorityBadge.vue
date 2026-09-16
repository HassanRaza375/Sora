<script setup lang="ts">
import type { Priority } from '@/models'

defineProps<{
  priority: Priority
}>()

// Literal class strings (not template-interpolated) so Tailwind's scanner
// can actually see and generate them — a dynamically-built class name like
// `bg-priority-${priority}` would silently produce no CSS.
const classesByPriority: Record<Priority, string> = {
  urgent: 'bg-priority-urgent/15 text-priority-urgent',
  high: 'bg-priority-high/15 text-priority-high',
  medium: 'bg-priority-medium/15 text-priority-medium',
  low: 'bg-priority-low/15 text-priority-low',
}

const labelByPriority: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}
</script>

<template>
  <span :class="['text-caption inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-medium', classesByPriority[priority]]">
    {{ labelByPriority[priority] }}
  </span>
</template>

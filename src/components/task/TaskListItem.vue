<script setup lang="ts">
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'

import PriorityBadge from '@/components/shared/PriorityBadge.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { useTasks } from '@/composables/useTasks'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/models'

// Row layout for flat lists (Inbox, Tasks List view). The Kanban board
// uses the separate TaskCard.vue instead — the layouts diverge enough
// (single-line row vs. stacked card, plus drag-and-drop) that forcing
// them into one component with a variant prop wasn't worth it; they share
// PriorityBadge and call useTasks()/useTaskDrawer() directly rather than
// going through an extra wrapper composable for the ~3-line toggle handler.
const props = defineProps<{
  task: Task
  /** Optional — Inbox tasks never have one; Tasks List passes it when known. */
  project?: Project
}>()

const { setTaskStatus } = useTasks()
const { openTaskDrawer } = useTaskDrawer()

function onToggleDone(value: boolean | 'indeterminate') {
  void setTaskStatus(props.task.id, value === true ? 'done' : 'todo')
}
</script>

<template>
  <li>
    <button
      type="button"
      class="hover:bg-accent/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      @click="openTaskDrawer(task.id)"
    >
      <Checkbox :model-value="task.status === 'done'" class="shrink-0" @click.stop @update:model-value="onToggleDone" />

      <span :class="cn('text-body flex-1 truncate transition-colors', task.status === 'done' && 'text-muted-foreground line-through')">
        {{ task.title }}
      </span>

      <span v-if="project" class="text-caption text-muted-foreground inline-flex shrink-0 items-center gap-1.5">
        <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: project.color }" />
        {{ project.name }}
      </span>

      <PriorityBadge v-if="task.priority" :priority="task.priority" />

      <span v-if="task.dueDate" class="text-caption text-muted-foreground shrink-0">
        {{ format(parseISO(task.dueDate), 'MMM d') }}
      </span>
    </button>
  </li>
</template>

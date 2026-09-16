<script setup lang="ts">
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'

import PriorityBadge from '@/components/shared/PriorityBadge.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { useTasks } from '@/composables/useTasks'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/models'

// Kanban's stacked-card layout, separate from TaskListItem's single-line
// row — see the note in TaskListItem.vue for why these aren't one
// component with a variant prop. Draggable via native HTML5 DnD (no drag
// library dependency); the drop target (the column, in TasksView.vue)
// reads the id set here and updates status through useTasks(), not Dexie.
const props = defineProps<{
  task: Task
  project?: Project
}>()

const { setTaskStatus } = useTasks()
const { openTaskDrawer } = useTaskDrawer()

function onToggleDone(value: boolean | 'indeterminate') {
  void setTaskStatus(props.task.id, value === true ? 'done' : 'todo')
}

function onDragStart(event: DragEvent) {
  event.dataTransfer?.setData('text/plain', props.task.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <div
    draggable="true"
    class="border-border bg-card hover:border-primary/40 cursor-grab rounded-lg border p-3 shadow-sm transition-colors active:cursor-grabbing"
    @dragstart="onDragStart"
    @click="openTaskDrawer(task.id)"
  >
    <div class="flex items-start gap-2">
      <Checkbox
        :model-value="task.status === 'done'"
        class="mt-0.5 shrink-0"
        @click.stop
        @update:model-value="onToggleDone"
      />
      <p :class="cn('text-body flex-1 transition-colors', task.status === 'done' && 'text-muted-foreground line-through')">
        {{ task.title }}
      </p>
    </div>

    <div v-if="task.priority || task.dueDate || project" class="mt-2 flex flex-wrap items-center gap-2 pl-6">
      <PriorityBadge v-if="task.priority" :priority="task.priority" />
      <span v-if="task.dueDate" class="text-caption text-muted-foreground">
        {{ format(parseISO(task.dueDate), 'MMM d') }}
      </span>
      <span v-if="project" class="text-caption text-muted-foreground inline-flex items-center gap-1.5">
        <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: project.color }" />
        {{ project.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp, RefreshCw } from '@lucide/vue'
import { ref } from 'vue'

import PriorityBadge from '@/components/shared/PriorityBadge.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePlanner } from '@/composables/usePlanner'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { useTasks } from '@/composables/useTasks'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/utils/duration'

// Rendered by TodayView only when a plan already exists (see hasPlan
// there) — this component doesn't own the "no plan yet" state, just the
// recommendation once one exists.
const { plan, candidateTasks, plannedTasks, overflowTasks, capacityMinutes, regeneratePlan, moveToOverflow, moveToPlanned, reorderPlanned } =
  usePlanner()
const { setTaskStatus } = useTasks()
const { openTaskDrawer } = useTaskDrawer()

const confirmRegenerateOpen = ref(false)

async function handleRegenerate() {
  await regeneratePlan()
  confirmRegenerateOpen.value = false
}

function onToggleDone(taskId: string, value: boolean | 'indeterminate') {
  void setTaskStatus(taskId, value === true ? 'done' : 'todo')
}
</script>

<template>
  <section v-if="plan" class="border-border bg-card flex flex-col gap-5 rounded-lg border p-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-meta text-muted-foreground font-medium">Today's plan</h2>
        <p class="text-caption text-muted-foreground">
          {{ formatDuration(plan.plannedMinutes) }} planned of {{ formatDuration(capacityMinutes) }} available
        </p>
      </div>
      <Button variant="ghost" size="sm" class="gap-1.5" @click="confirmRegenerateOpen = true">
        <RefreshCw class="h-3.5 w-3.5" />
        Regenerate
      </Button>
    </div>

    <div class="flex flex-col gap-2">
      <h3 class="text-caption text-muted-foreground font-medium tracking-wide uppercase">Planned</h3>
      <p v-if="plannedTasks.length === 0 && candidateTasks.length === 0" class="text-caption text-muted-foreground">
        No tasks marked Today or overdue to plan.
      </p>
      <p v-else-if="plannedTasks.length === 0" class="text-caption text-muted-foreground">
        Nothing fits today's capacity yet.
      </p>
      <ul v-else class="flex flex-col gap-1">
        <li
          v-for="(task, index) in plannedTasks"
          :key="task.id"
          class="hover:bg-accent/50 flex items-center gap-2 rounded-md px-2 py-1.5"
        >
          <Checkbox :model-value="task.status === 'done'" @update:model-value="(value) => onToggleDone(task.id, value)" />

          <button
            type="button"
            class="flex flex-1 items-center gap-2 truncate text-left"
            @click="openTaskDrawer(task.id)"
          >
            <span :class="cn('text-body truncate transition-colors', task.status === 'done' && 'text-muted-foreground line-through')">
              {{ task.title }}
            </span>
            <PriorityBadge v-if="task.priority" :priority="task.priority" />
            <span class="text-caption text-muted-foreground shrink-0">{{ formatDuration(task.estimatedDuration) }}</span>
          </button>

          <div class="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              :disabled="index === 0"
              aria-label="Move up"
              @click="reorderPlanned(task.id, 'up')"
            >
              <ArrowUp class="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              :disabled="index === plannedTasks.length - 1"
              aria-label="Move down"
              @click="reorderPlanned(task.id, 'down')"
            >
              <ArrowDown class="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" @click="moveToOverflow(task.id)">Overflow</Button>
          </div>
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h3 class="text-caption text-priority-urgent font-medium tracking-wide uppercase">Overflow</h3>
      <p v-if="overflowTasks.length === 0" class="text-caption text-muted-foreground">Nothing left over.</p>
      <ul v-else class="flex flex-col gap-1">
        <li
          v-for="task in overflowTasks"
          :key="task.id"
          class="hover:bg-accent/50 flex items-center gap-2 rounded-md px-2 py-1.5"
        >
          <Checkbox :model-value="task.status === 'done'" @update:model-value="(value) => onToggleDone(task.id, value)" />

          <button
            type="button"
            class="flex flex-1 items-center gap-2 truncate text-left"
            @click="openTaskDrawer(task.id)"
          >
            <span :class="cn('text-body truncate transition-colors', task.status === 'done' && 'text-muted-foreground line-through')">
              {{ task.title }}
            </span>
            <PriorityBadge v-if="task.priority" :priority="task.priority" />
            <span class="text-caption text-muted-foreground shrink-0">{{ formatDuration(task.estimatedDuration) }}</span>
          </button>

          <Button variant="ghost" size="sm" class="h-6 shrink-0 px-2 text-xs" @click="moveToPlanned(task.id)">Plan it</Button>
        </li>
      </ul>
    </div>

    <Dialog v-model:open="confirmRegenerateOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate today's plan?</DialogTitle>
          <DialogDescription>
            This discards any manual changes you've made and rebuilds the recommendation from your current tasks and
            availability.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="confirmRegenerateOpen = false">Cancel</Button>
          <Button variant="destructive" @click="handleRegenerate">Regenerate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>

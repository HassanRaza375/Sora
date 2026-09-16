<script setup lang="ts">
import { Inbox } from '@lucide/vue'

import TaskListItem from '@/components/task/TaskListItem.vue'
import { useTasks } from '@/composables/useTasks'

const { inboxTasks } = useTasks()
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
    <header>
      <h1 class="text-page-title">Inbox</h1>
      <p class="text-meta text-muted-foreground">
        Capture ideas here — they stay until you give them a project or a due date.
      </p>
    </header>

    <div
      v-if="inboxTasks.length === 0"
      class="text-muted-foreground flex flex-col items-center gap-3 py-20 text-center"
    >
      <Inbox class="h-8 w-8" />
      <p class="text-body">Inbox is empty.</p>
    </div>

    <ul v-else class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
      <TaskListItem v-for="task in inboxTasks" :key="task.id" :task="task" />
    </ul>
  </div>
</template>

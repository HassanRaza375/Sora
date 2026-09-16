<script setup lang="ts">
import { AlertTriangle, CalendarClock, CheckCircle2, Sparkles } from '@lucide/vue'
import { format } from 'date-fns/format'
import { computed } from 'vue'

import PlanPanel from '@/components/today/PlanPanel.vue'
import TaskListItem from '@/components/task/TaskListItem.vue'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/composables/usePlanner'
import { useProjects } from '@/composables/useProjects'
import { useTasks } from '@/composables/useTasks'
import { useWorkload } from '@/composables/useWorkload'
import type { Project } from '@/models'
import { dateOffsetIso } from '@/utils/date'
import { formatDuration } from '@/utils/duration'

const { todayTasks, overdueTasks, dueBetween } = useTasks()
const { projects } = useProjects()
const { summary: workload } = useWorkload(todayTasks)
const { generatePlan } = usePlanner()

async function handlePlanMyDay() {
  await generatePlan()
}

const projectsById = computed(() => {
  const map: Record<string, Project> = {}
  for (const project of projects.value) map[project.id] = project
  return map
})
function projectFor(task: { projectId?: string }) {
  return task.projectId ? projectsById.value[task.projectId] : undefined
}

const now = new Date()
const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
const dateLabel = format(now, 'EEEE, MMMM d')

// Due tomorrow through 6 days out — deliberately excludes today (already
// its own section above) and can never include overdue (range starts
// after today), so no extra filtering needed for either. Still excludes
// done tasks explicitly since dueBetween() is a raw due-date filter with
// no status opinion baked in (matches how TasksView.vue composes it too).
const upcomingTasks = computed(() =>
  dueBetween(dateOffsetIso(1), dateOffsetIso(6)).filter((task) => task.status !== 'done'),
)
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-8 p-6 md:p-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-page-title">{{ greeting }}</h1>
        <p class="text-secondary text-muted-foreground">{{ dateLabel }}</p>
      </div>
      <Button title="Build a recommended plan from today's tasks and your availability" class="gap-2" @click="handlePlanMyDay">
        <Sparkles class="h-4 w-4" />
        Plan My Day
      </Button>
    </header>

    <div class="border-border bg-card flex items-center justify-between rounded-lg border p-4">
      <div>
        <p class="text-secondary text-muted-foreground">Today's workload</p>
        <p class="text-section">{{ workload.count }} task{{ workload.count === 1 ? '' : 's' }}</p>
      </div>
      <p class="text-section text-muted-foreground">{{ formatDuration(workload.totalMinutes) }}</p>
    </div>

    <PlanPanel />

    <section v-if="overdueTasks.length > 0" class="border-priority-urgent/30 bg-priority-urgent/5 flex flex-col gap-3 rounded-lg border p-4">
      <h2 class="text-priority-urgent flex items-center gap-2 font-medium">
        <AlertTriangle class="h-4 w-4" />
        Overdue ({{ overdueTasks.length }})
      </h2>
      <ul class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
        <TaskListItem v-for="task in overdueTasks" :key="task.id" :task="task" :project="projectFor(task)" />
      </ul>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-secondary text-muted-foreground font-medium">Today's tasks</h2>

      <div v-if="todayTasks.length === 0" class="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2 class="h-8 w-8" />
        <p class="text-body">Nothing marked for today.</p>
        <p class="text-caption">Toggle "Today" on a task from Inbox or Tasks to bring it here.</p>
      </div>
      <ul v-else class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
        <TaskListItem v-for="task in todayTasks" :key="task.id" :task="task" :project="projectFor(task)" />
      </ul>
    </section>

    <section v-if="upcomingTasks.length > 0" class="flex flex-col gap-3">
      <h2 class="text-secondary text-muted-foreground flex items-center gap-2 font-medium">
        <CalendarClock class="h-4 w-4" />
        Upcoming deadlines
      </h2>
      <ul class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
        <TaskListItem v-for="task in upcomingTasks" :key="task.id" :task="task" :project="projectFor(task)" />
      </ul>
    </section>
  </div>
</template>

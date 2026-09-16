<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInsights, type InsightsRange } from '@/composables/useInsights'
import { useProjectProgress } from '@/composables/useProjectProgress'
import { useProjects } from '@/composables/useProjects'
import { formatDuration } from '@/utils/duration'

const route = useRoute()
const router = useRouter()

// Follows the same "?view=" URL-sync convention Tasks' List/Kanban toggle
// and Calendar's Month/Agenda toggle already established (router.replace,
// so flipping between the 3 options repeatedly doesn't pile up
// back-button history) — this is a small fixed set of view options, not
// continuous navigation like Calendar's specific-month stepping, so it
// gets the "view toggle" treatment, not the "?month=" exception. One
// range drives every metric section below, not a per-section selector.
const range = computed<InsightsRange>(() => {
  const raw = route.query.range
  return raw === 'month' || raw === 'all' ? raw : 'week'
})

function onRangeChange(value: unknown) {
  if (value !== 'week' && value !== 'month' && value !== 'all') return
  void router.replace({ query: { ...route.query, range: value === 'week' ? undefined : value } })
}

const { tasksCompleted, completionRate, workload, recurringCompletion, planningAccuracy } = useInsights(range)
const { projects } = useProjects()
const { progressFor } = useProjectProgress()
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-8 p-6 md:p-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-page-title">Insights</h1>
        <p class="text-secondary text-muted-foreground">Light analytics on how you're doing.</p>
      </div>

      <Tabs :model-value="range" @update:model-value="onRangeChange">
        <TabsList>
          <TabsTrigger value="week">This week</TabsTrigger>
          <TabsTrigger value="month">This month</TabsTrigger>
          <TabsTrigger value="all">All time</TabsTrigger>
        </TabsList>
      </Tabs>
    </header>

    <section class="grid grid-cols-2 gap-4">
      <div class="border-border bg-card rounded-lg border p-4">
        <p class="text-secondary text-muted-foreground">Tasks completed</p>
        <p class="text-section">{{ tasksCompleted }}</p>
      </div>
      <div class="border-border bg-card rounded-lg border p-4">
        <p class="text-secondary text-muted-foreground">Completion rate</p>
        <p class="text-section">{{ completionRate }}%</p>
      </div>
    </section>

    <section class="border-border bg-card flex items-center justify-between rounded-lg border p-4">
      <div>
        <p class="text-secondary text-muted-foreground">Workload (due in range)</p>
        <p class="text-section">{{ workload.count }} task{{ workload.count === 1 ? '' : 's' }}</p>
      </div>
      <p class="text-section text-muted-foreground">{{ formatDuration(workload.totalMinutes) }}</p>
    </section>

    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-secondary text-muted-foreground font-medium">Project progress</h2>
        <p class="text-caption text-muted-foreground">Always current — not affected by the range above.</p>
      </div>

      <div v-if="projects.length === 0" class="text-muted-foreground py-8 text-center">
        <p class="text-body">No projects yet.</p>
      </div>
      <ul v-else class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
        <li v-for="project in projects" :key="project.id" class="flex flex-col gap-2 px-4 py-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-body inline-flex items-center gap-1.5">
              <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: project.color }" />
              {{ project.name }}
            </span>
            <span class="text-caption text-muted-foreground">
              {{ progressFor(project.id).completed }}/{{ progressFor(project.id).total }}
            </span>
          </div>
          <Progress :model-value="progressFor(project.id).percent" />
        </li>
      </ul>
    </section>

    <section class="border-border bg-card flex items-center justify-between rounded-lg border p-4">
      <div>
        <p class="text-secondary text-muted-foreground">Recurring task completion</p>
        <p class="text-section">
          <template v-if="recurringCompletion.total === 0">No recurring instances in range</template>
          <template v-else>{{ recurringCompletion.completed }} of {{ recurringCompletion.total }}</template>
        </p>
      </div>
      <p v-if="recurringCompletion.percent !== undefined" class="text-section text-muted-foreground">
        {{ recurringCompletion.percent }}%
      </p>
    </section>

    <section class="border-border bg-card flex flex-col gap-2 rounded-lg border p-4">
      <div class="flex items-center justify-between">
        <p class="text-secondary text-muted-foreground">Planning accuracy</p>
        <p v-if="planningAccuracy.percent !== undefined" class="text-section">{{ planningAccuracy.percent }}%</p>
      </div>
      <p class="text-caption text-muted-foreground">
        <template v-if="planningAccuracy.planned === 0">No plans in this range yet.</template>
        <template v-else>
          {{ planningAccuracy.completed }} of {{ planningAccuracy.planned }} planned tasks were completed on the day
          they were planned for.
        </template>
      </p>
    </section>
  </div>
</template>

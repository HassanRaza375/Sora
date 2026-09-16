<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import TaskCard from '@/components/task/TaskCard.vue'
import TaskListItem from '@/components/task/TaskListItem.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjects } from '@/composables/useProjects'
import { useTasks } from '@/composables/useTasks'
import type { Priority, Project, Task, TaskStatus } from '@/models'
import { dateOffsetIso, todayIso } from '@/utils/date'

const route = useRoute()
const router = useRouter()

const { tasks, setTaskStatus } = useTasks()
const { projects } = useProjects()

const projectsById = computed(() => {
  const map: Record<string, Project> = {}
  for (const project of projects.value) map[project.id] = project
  return map
})

// View toggle lives in the URL (?view=list|kanban) — same convention as
// the task drawer's `?task=` param, so it's shareable/bookmarkable. Uses
// router.replace (not push) so toggling the view repeatedly doesn't pile
// up back-button history entries the way opening/closing the drawer does.
const view = computed<'list' | 'kanban'>(() => (route.query.view === 'kanban' ? 'kanban' : 'list'))

function onViewChange(value: unknown) {
  if (value !== 'list' && value !== 'kanban') return
  void router.replace({ query: { ...route.query, view: value === 'list' ? undefined : value } })
}

const ALL = 'all'
const projectFilter = ref<string>(ALL)
const statusFilter = ref<'active' | TaskStatus | 'all'>('active')
const priorityFilter = ref<Priority | 'all'>(ALL)
const dueFilter = ref<'any' | 'overdue' | 'today' | 'week' | 'none'>('any')

function onProjectFilterChange(value: unknown) {
  if (typeof value === 'string') projectFilter.value = value
}
function onStatusFilterChange(value: unknown) {
  if (typeof value === 'string') statusFilter.value = value as typeof statusFilter.value
}
function onPriorityFilterChange(value: unknown) {
  if (typeof value === 'string') priorityFilter.value = value as typeof priorityFilter.value
}
function onDueFilterChange(value: unknown) {
  if (typeof value === 'string') dueFilter.value = value as typeof dueFilter.value
}

const todayStr = todayIso()
const weekEndStr = dateOffsetIso(6)

function matchesDueFilter(task: Task): boolean {
  switch (dueFilter.value) {
    case 'overdue':
      return !!task.dueDate && task.dueDate < todayStr
    case 'today':
      return task.dueDate === todayStr
    case 'week':
      return !!task.dueDate && task.dueDate >= todayStr && task.dueDate <= weekEndStr
    case 'none':
      return !task.dueDate
    default:
      return true
  }
}

// Project/priority/due-date only — status is applied separately below, so
// Kanban (which wants every status, just grouped into columns) and the
// List view (which defaults to hiding Done) can share this same base set.
const baseFilteredTasks = computed(() =>
  tasks.value.filter((task) => {
    if (projectFilter.value !== ALL && task.projectId !== projectFilter.value) return false
    if (priorityFilter.value !== ALL && task.priority !== priorityFilter.value) return false
    if (!matchesDueFilter(task)) return false
    return true
  }),
)

const listFilteredTasks = computed(() =>
  baseFilteredTasks.value.filter((task) => {
    if (statusFilter.value === 'active') return task.status !== 'done'
    if (statusFilter.value === 'all') return true
    return task.status === statusFilter.value
  }),
)

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
]

const kanbanColumns = computed(() =>
  columns.map((column) => ({
    ...column,
    tasks: baseFilteredTasks.value.filter((task) => task.status === column.status),
  })),
)

function onDrop(event: DragEvent, status: TaskStatus) {
  const taskId = event.dataTransfer?.getData('text/plain')
  if (taskId) void setTaskStatus(taskId, status)
}

function projectFor(task: Task) {
  return task.projectId ? projectsById.value[task.projectId] : undefined
}
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-6 p-6 md:p-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-page-title">Tasks</h1>
        <p class="text-meta text-muted-foreground">All your tasks, filtered and organized.</p>
      </div>

      <Tabs :model-value="view" @update:model-value="onViewChange">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
      </Tabs>
    </header>

    <div class="flex flex-wrap gap-3">
      <Select :model-value="projectFilter" @update:model-value="onProjectFilterChange">
        <SelectTrigger class="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">All projects</SelectItem>
          <SelectItem v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-if="view === 'list'" :model-value="statusFilter" @update:model-value="onStatusFilterChange">
        <SelectTrigger class="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="todo">To Do</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
        </SelectContent>
      </Select>

      <Select :model-value="priorityFilter" @update:model-value="onPriorityFilterChange">
        <SelectTrigger class="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Any priority</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select :model-value="dueFilter" @update:model-value="onDueFilterChange">
        <SelectTrigger class="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any due date</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="today">Due today</SelectItem>
          <SelectItem value="week">Due this week</SelectItem>
          <SelectItem value="none">No due date</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <template v-if="view === 'list'">
      <div v-if="listFilteredTasks.length === 0" class="text-muted-foreground py-16 text-center">
        <p class="text-body">No tasks match these filters.</p>
      </div>
      <ul v-else class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
        <TaskListItem v-for="task in listFilteredTasks" :key="task.id" :task="task" :project="projectFor(task)" />
      </ul>
    </template>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div
        v-for="column in kanbanColumns"
        :key="column.status"
        class="bg-secondary/40 flex flex-col gap-3 rounded-lg p-3"
        @dragover.prevent
        @drop.prevent="onDrop($event, column.status)"
      >
        <h2 class="text-meta text-muted-foreground flex items-center justify-between font-medium">
          {{ column.title }}
          <span class="text-caption">{{ column.tasks.length }}</span>
        </h2>

        <div class="flex flex-col gap-2">
          <TaskCard v-for="task in column.tasks" :key="task.id" :task="task" :project="projectFor(task)" />
        </div>

        <p v-if="column.tasks.length === 0" class="text-caption text-muted-foreground py-4 text-center">No tasks</p>
      </div>
    </div>
  </div>
</template>

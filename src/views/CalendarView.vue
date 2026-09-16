<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import TaskListItem from '@/components/task/TaskListItem.vue'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjects } from '@/composables/useProjects'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { useTasks } from '@/composables/useTasks'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/models'
import { currentMonthIso, localIso, monthEndIso, monthOffsetIso, monthStartIso, todayIso } from '@/utils/date'

const route = useRoute()
const router = useRouter()

const { dueBetween } = useTasks()
const { projects } = useProjects()
const { openTaskDrawer } = useTaskDrawer()

const projectsById = computed(() => {
  const map: Record<string, Project> = {}
  for (const project of projects.value) map[project.id] = project
  return map
})
function projectFor(task: Task) {
  return task.projectId ? projectsById.value[task.projectId] : undefined
}

// Month/Agenda toggle follows the same ?view= convention as Tasks'
// list/kanban toggle (router.replace — repeatedly flipping the tab
// shouldn't pile up back-button history).
const view = computed<'month' | 'agenda'>(() => (route.query.view === 'agenda' ? 'agenda' : 'month'))
function onViewChange(value: unknown) {
  if (value !== 'month' && value !== 'agenda') return
  void router.replace({ query: { ...route.query, view: value === 'month' ? undefined : value } })
}

// Unlike Tasks' filters (deliberately local-only, not URL-synced), the
// visible month lives in the URL (?month=YYYY-MM) via router.push. "Which
// month am I looking at" is different enough to warrant the exception: a
// user is far more likely to want to bookmark/share a specific month than
// a filter combination, and stepping through months is exactly the kind
// of navigation where landing back on the previous month via the browser
// back button is the behavior people expect — unlike the view toggle,
// where piling up history would be annoying. Both Month and Agenda read
// this same state, so the range logic (and its Playwright verification)
// only has to exist once.
const visibleMonth = computed(() => {
  const raw = route.query.month
  return typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw) ? raw : currentMonthIso()
})

function goToMonth(monthIso: string) {
  void router.push({ query: { ...route.query, month: monthIso === currentMonthIso() ? undefined : monthIso } })
}
function prevMonth() {
  goToMonth(monthOffsetIso(visibleMonth.value, -1))
}
function nextMonth() {
  goToMonth(monthOffsetIso(visibleMonth.value, 1))
}
function goToToday() {
  goToMonth(currentMonthIso())
}

const monthLabel = computed(() => format(parseISO(`${visibleMonth.value}-01`), 'MMMM yyyy'))

// dueBetween() is the same single-criterion helper Today's "Upcoming
// deadlines" section uses — Calendar just points it at the visible
// month's range instead of a rolling 6-day window. Done tasks are
// excluded here (the caller's job, same as everywhere else dueBetween is
// used) since a deadline-focused view isn't useful for work already
// finished.
const tasksInMonth = computed(() =>
  dueBetween(monthStartIso(visibleMonth.value), monthEndIso(visibleMonth.value)).filter(
    (task) => task.status !== 'done',
  ),
)

const tasksByDate = computed(() => {
  const map: Record<string, Task[]> = {}
  for (const task of tasksInMonth.value) {
    if (!task.dueDate) continue
    ;(map[task.dueDate] ??= []).push(task)
  }
  return map
})

const agendaGroups = computed(() => {
  const sorted = [...tasksInMonth.value].sort((a, b) => {
    const dueCompare = (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
    if (dueCompare !== 0) return dueCompare
    return (a.dueTime ?? '').localeCompare(b.dueTime ?? '')
  })
  const groups: { dateIso: string; tasks: Task[] }[] = []
  for (const task of sorted) {
    if (!task.dueDate) continue
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.dateIso === task.dueDate) lastGroup.tasks.push(task)
    else groups.push({ dateIso: task.dueDate, tasks: [task] })
  }
  return groups
})

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_VISIBLE_PER_CELL = 3

interface GridDay {
  dateIso: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
}

// Always a fixed 6x7 grid (42 cells), padded with leading/trailing days
// from the adjacent months, so the grid height never jumps around as the
// user navigates between months with different day counts.
const gridDays = computed<GridDay[]>(() => {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  const firstOfMonth = new Date(year, month - 1, 1)
  const gridStart = new Date(year, month - 1, 1 - firstOfMonth.getDay())
  const todayStr = todayIso()

  const days: GridDay[] = []
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + i)
    const dateIso = localIso(cellDate)
    days.push({
      dateIso,
      dayNumber: cellDate.getDate(),
      inMonth: cellDate.getMonth() === month - 1,
      isToday: dateIso === todayStr,
    })
  }
  return days
})
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-page-title">Calendar</h1>
        <p class="text-secondary text-muted-foreground">Deadlines at a glance.</p>
      </div>

      <Tabs :model-value="view" @update:model-value="onViewChange">
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>
      </Tabs>
    </header>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Previous month" @click="prevMonth">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Next month" @click="nextMonth">
          <ChevronRight class="h-4 w-4" />
        </Button>
        <h2 class="text-section ml-2">{{ monthLabel }}</h2>
      </div>
      <Button variant="outline" size="sm" @click="goToToday">Today</Button>
    </div>

    <template v-if="view === 'month'">
      <div class="border-border overflow-hidden rounded-lg border">
        <div class="border-border bg-secondary/40 text-caption text-muted-foreground grid grid-cols-7 border-b">
          <div v-for="label in WEEKDAY_LABELS" :key="label" class="px-2 py-2 text-center font-medium">
            {{ label }}
          </div>
        </div>

        <div class="grid grid-cols-7">
          <div
            v-for="day in gridDays"
            :key="day.dateIso"
            :class="
              cn(
                'border-border bg-card flex min-h-24 flex-col gap-1 border-r border-b p-1.5 last:border-r-0',
                !day.inMonth && 'bg-secondary/20 text-muted-foreground',
              )
            "
          >
            <span
              :class="
                cn(
                  'text-caption inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  day.isToday && 'bg-primary text-primary-foreground font-medium',
                )
              "
            >
              {{ day.dayNumber }}
            </span>

            <div class="flex flex-col gap-0.5">
              <button
                v-for="task in (tasksByDate[day.dateIso] ?? []).slice(0, MAX_VISIBLE_PER_CELL)"
                :key="task.id"
                type="button"
                class="hover:bg-accent/50 text-caption flex items-center gap-1 truncate rounded px-1 py-0.5 text-left"
                @click="openTaskDrawer(task.id)"
              >
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: projectFor(task)?.color ?? 'var(--color-muted-foreground)' }"
                />
                <span class="truncate">{{ task.title }}</span>
              </button>

              <p
                v-if="(tasksByDate[day.dateIso]?.length ?? 0) > MAX_VISIBLE_PER_CELL"
                class="text-caption text-muted-foreground px-1"
              >
                +{{ (tasksByDate[day.dateIso]?.length ?? 0) - MAX_VISIBLE_PER_CELL }} more
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="agendaGroups.length === 0" class="text-muted-foreground py-16 text-center">
        <p class="text-body">No deadlines this month.</p>
      </div>
      <div v-else class="flex flex-col gap-6">
        <section v-for="group in agendaGroups" :key="group.dateIso" class="flex flex-col gap-2">
          <h3 class="text-secondary text-muted-foreground font-medium">
            {{ format(parseISO(group.dateIso), 'EEEE, MMMM d') }}
          </h3>
          <ul class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
            <TaskListItem v-for="task in group.tasks" :key="task.id" :task="task" :project="projectFor(task)" />
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

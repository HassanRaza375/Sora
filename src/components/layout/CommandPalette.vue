<script setup lang="ts">
import { FolderKanban, ListChecks, Plus, Search, Sparkles } from '@lucide/vue'
import { computed, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCommandPalette } from '@/composables/useCommandPalette'
import { usePlanner } from '@/composables/usePlanner'
import { useProjects } from '@/composables/useProjects'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { useTasks } from '@/composables/useTasks'
import { cn } from '@/lib/utils'
import { routes } from '@/router/routes'

import { navIcons } from './navIcons'

const { isOpen, query, close } = useCommandPalette()
const router = useRouter()
const { openTaskDrawer } = useTaskDrawer()
const { tasks } = useTasks()
const { projects } = useProjects()
const { hasPlan, generatePlan } = usePlanner()

interface PaletteItem {
  id: string
  label: string
  hint?: string
  icon: Component
  run: () => void
}

// Reuses routes.ts (already the single source of truth for nav — see
// Sidebar.vue/BottomNav.vue) rather than a second hand-maintained list,
// same reasoning CLAUDE.md's Routing section already documents.
const navItems = computed<PaletteItem[]>(() =>
  routes
    .filter((route) => route.meta?.showInSidebar)
    .map((route) => ({
      id: `nav-${String(route.name)}`,
      label: route.meta!.title,
      icon: navIcons[route.meta!.icon],
      run: () => {
        close()
        void router.push(route.path)
      },
    })),
)

// "At minimum" per the spec: New Task and Plan My Day. Plan My Day
// reflects usePlanner()'s existing no-op-if-already-planned behavior
// (Phase 8) rather than presenting an action that would silently do
// nothing if clicked — once today has a plan, this relabels to "View
// today's plan" and just navigates there instead of re-running
// generatePlan() (which is already a safe no-op, but presenting a
// button labeled "Plan My Day" that visibly does nothing would still
// read as broken).
const actionItems = computed<PaletteItem[]>(() => [
  {
    id: 'action-new-task',
    label: 'New Task',
    icon: Plus,
    run: () => {
      close()
      void openTaskDrawer()
    },
  },
  {
    id: 'action-plan-day',
    label: hasPlan.value ? "View today's plan" : 'Plan My Day',
    hint: hasPlan.value ? 'Already planned' : undefined,
    icon: Sparkles,
    run: () => {
      close()
      if (!hasPlan.value) void generatePlan()
      void router.push('/today')
    },
  },
])

const MAX_TASK_RESULTS = 8
const MAX_PROJECT_RESULTS = 5

const normalizedQuery = computed(() => String(query.value).trim().toLowerCase())

const filteredNavItems = computed(() =>
  normalizedQuery.value
    ? navItems.value.filter((item) => item.label.toLowerCase().includes(normalizedQuery.value))
    : navItems.value,
)
const filteredActionItems = computed(() =>
  normalizedQuery.value
    ? actionItems.value.filter((item) => item.label.toLowerCase().includes(normalizedQuery.value))
    : actionItems.value,
)

// Search scope: a live client-side filter over useTasks()'s/useProjects()'s
// existing reactive data (task titles + project names), not a new indexed
// search structure — a personal task app's dataset is small enough that
// scanning it on every keystroke is free, and building/maintaining a
// search index would be solving a problem this scale doesn't have. Tasks
// and projects only ever appear once a query is actually typed (an empty
// query would just be "every task," not a useful command list); nav/
// actions show by default and narrow as you type, everything filtered by
// the exact same substring match.
const matchingTasks = computed<PaletteItem[]>(() => {
  if (!normalizedQuery.value) return []
  return tasks.value
    .filter((task) => task.title.toLowerCase().includes(normalizedQuery.value))
    .slice(0, MAX_TASK_RESULTS)
    .map((task) => ({
      id: `task-${task.id}`,
      label: task.title,
      hint: task.status === 'done' ? 'Done' : undefined,
      icon: ListChecks,
      run: () => {
        close()
        void openTaskDrawer(task.id)
      },
    }))
})

const matchingProjects = computed<PaletteItem[]>(() => {
  if (!normalizedQuery.value) return []
  return projects.value
    .filter((project) => project.name.toLowerCase().includes(normalizedQuery.value))
    .slice(0, MAX_PROJECT_RESULTS)
    .map((project) => ({
      id: `project-${project.id}`,
      label: project.name,
      icon: FolderKanban,
      run: () => {
        close()
        void router.push(`/projects/${project.id}`)
      },
    }))
})

interface PaletteSection {
  label: string
  items: PaletteItem[]
}

const sections = computed<PaletteSection[]>(() =>
  [
    { label: 'Tasks', items: matchingTasks.value },
    { label: 'Projects', items: matchingProjects.value },
    { label: 'Navigate', items: filteredNavItems.value },
    { label: 'Actions', items: filteredActionItems.value },
  ].filter((section) => section.items.length > 0),
)

const flatItems = computed(() => sections.value.flatMap((section) => section.items))
const indexById = computed(() => new Map(flatItems.value.map((item, index) => [item.id, index])))

const selectedIndex = ref(0)
watch(flatItems, () => {
  selectedIndex.value = 0
})

// For aria-activedescendant — the standard accessible-combobox pattern:
// focus stays on the input the whole time, and the currently "selected"
// option is only ever communicated via this attribute + role="option"'s
// aria-selected below, not by actually moving DOM focus onto each row.
const activeDescendantId = computed(() => {
  const item = flatItems.value[selectedIndex.value]
  return item ? `palette-item-${item.id}` : undefined
})
watch(isOpen, (open) => {
  if (open) selectedIndex.value = 0
})

function moveSelection(delta: number) {
  const count = flatItems.value.length
  if (count === 0) return
  selectedIndex.value = (selectedIndex.value + delta + count) % count
}

function runSelected() {
  flatItems.value[selectedIndex.value]?.run()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveSelection(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveSelection(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    runSelected()
  }
  // Escape isn't handled here — DialogContent (reka-ui) already closes
  // on Escape as part of its own built-in focus-trap/dismiss behavior.
}

function handleOpenChange(open: boolean) {
  if (!open) close()
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="top-24 max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-24">
      <DialogTitle class="sr-only">Command palette</DialogTitle>
      <DialogDescription class="sr-only">
        Search tasks and projects, jump to any view, or run a quick action. Use the up and down arrow keys to choose
        a result and Enter to select it.
      </DialogDescription>

      <div class="border-border flex items-center gap-2 border-b px-4">
        <Search class="text-muted-foreground h-4 w-4 shrink-0" />
        <Input
          v-model="query"
          autofocus
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="command-palette-listbox"
          :aria-activedescendant="activeDescendantId"
          placeholder="Search tasks, projects, or jump somewhere…"
          class="h-12 border-none px-0 shadow-none focus-visible:ring-0"
          @keydown="onKeydown"
        />
      </div>

      <div id="command-palette-listbox" role="listbox" aria-label="Command palette results" class="max-h-80 overflow-y-auto p-2">
        <p v-if="flatItems.length === 0" class="text-caption text-muted-foreground px-2 py-6 text-center">
          No matches.
        </p>

        <div v-for="section in sections" :key="section.label" role="group" :aria-label="section.label" class="flex flex-col gap-0.5 py-1">
          <p class="text-caption text-muted-foreground px-2 py-1 font-medium" aria-hidden="true">{{ section.label }}</p>
          <button
            v-for="item in section.items"
            :id="`palette-item-${item.id}`"
            :key="item.id"
            type="button"
            role="option"
            tabindex="-1"
            :aria-selected="indexById.get(item.id) === selectedIndex"
            :class="
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                indexById.get(item.id) === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
              )
            "
            @click="item.run()"
            @mouseenter="selectedIndex = indexById.get(item.id) ?? selectedIndex"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="text-body flex-1 truncate">{{ item.label }}</span>
            <span v-if="item.hint" class="text-caption text-muted-foreground shrink-0">{{ item.hint }}</span>
          </button>
        </div>
      </div>

      <!-- Visual-only: a screen reader already gets equivalent (arguably
           better) instructions from role="combobox"/"listbox" and the
           DialogDescription above — this row would just be redundant
           noise read aloud, not new information. -->
      <div aria-hidden="true" class="border-border text-caption text-muted-foreground flex items-center gap-4 border-t px-4 py-2">
        <span class="inline-flex items-center gap-1.5">
          <kbd class="border-border bg-secondary rounded border px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
          Navigate
        </span>
        <span class="inline-flex items-center gap-1.5">
          <kbd class="border-border bg-secondary rounded border px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
          Select
        </span>
        <span class="inline-flex items-center gap-1.5">
          <kbd class="border-border bg-secondary rounded border px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
          Close
        </span>
      </div>
    </DialogContent>
  </Dialog>
</template>

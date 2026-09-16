<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ProjectDialog from '@/components/project/ProjectDialog.vue'
import { projectIcons } from '@/components/project/projectIcons'
import TaskListItem from '@/components/task/TaskListItem.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useProjectProgress } from '@/composables/useProjectProgress'
import { useProjects } from '@/composables/useProjects'
import { useTasks } from '@/composables/useTasks'

const route = useRoute()
const router = useRouter()

const { projects, deleteProject } = useProjects()
const { byProject } = useTasks()
const { progressFor } = useProjectProgress()

const projectId = computed(() => String(route.params.id))
const project = computed(() => projects.value.find((p) => p.id === projectId.value))
const projectTasks = computed(() => byProject(projectId.value))
const progress = computed(() => progressFor(projectId.value))

const editOpen = ref(false)
const confirmDeleteOpen = ref(false)

async function handleDelete() {
  await deleteProject(projectId.value)
  confirmDeleteOpen.value = false
  void router.push({ name: 'projects' })
}
</script>

<template>
  <div v-if="!project" class="mx-auto max-w-3xl p-6 md:p-8">
    <p class="text-body text-muted-foreground">Project not found.</p>
  </div>

  <div v-else class="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white"
          :style="{ backgroundColor: project.color }"
        >
          <component :is="projectIcons[project.icon ?? 'folder']" class="h-5 w-5" />
        </span>
        <div>
          <h1 class="text-page-title">{{ project.name }}</h1>
          <p v-if="project.description" class="text-meta text-muted-foreground">{{ project.description }}</p>
        </div>
      </div>

      <div class="flex gap-2">
        <Button variant="outline" @click="editOpen = true">Edit</Button>
        <Button variant="outline" @click="confirmDeleteOpen = true">Delete</Button>
      </div>
    </header>

    <div class="flex flex-col gap-1.5">
      <div class="text-caption text-muted-foreground flex items-center justify-between">
        <span>{{ progress.completed }} / {{ progress.total }} tasks done</span>
        <span>{{ progress.percent }}%</span>
      </div>
      <Progress :model-value="progress.percent" />
    </div>

    <div v-if="projectTasks.length === 0" class="text-muted-foreground py-16 text-center">
      <p class="text-body">No tasks in this project yet.</p>
    </div>
    <ul v-else class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
      <TaskListItem v-for="task in projectTasks" :key="task.id" :task="task" :project="project" />
    </ul>

    <ProjectDialog v-model:open="editOpen" :project="project" />

    <Dialog v-model:open="confirmDeleteOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete "{{ project.name }}"?</DialogTitle>
          <DialogDescription>Its tasks won't be deleted — they'll just no longer belong to a project.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="confirmDeleteOpen = false">Cancel</Button>
          <Button variant="destructive" @click="handleDelete">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

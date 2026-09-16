<script setup lang="ts">
import { FolderKanban, Plus } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import ProjectDialog from '@/components/project/ProjectDialog.vue'
import { projectIcons } from '@/components/project/projectIcons'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useProjectProgress } from '@/composables/useProjectProgress'
import { useProjects } from '@/composables/useProjects'

const { projects } = useProjects()
const { progressFor } = useProjectProgress()

const dialogOpen = ref(false)
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-page-title">Projects</h1>
        <p class="text-meta text-muted-foreground">Lightweight containers for related tasks.</p>
      </div>
      <Button class="gap-2" @click="dialogOpen = true">
        <Plus class="h-4 w-4" />
        New Project
      </Button>
    </header>

    <div v-if="projects.length === 0" class="text-muted-foreground flex flex-col items-center gap-3 py-20 text-center">
      <FolderKanban class="h-8 w-8" />
      <p class="text-body">No projects yet.</p>
    </div>

    <ul v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <li v-for="project in projects" :key="project.id">
        <RouterLink
          :to="{ name: 'project-detail', params: { id: project.id } }"
          class="border-border bg-card hover:border-primary/40 flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-colors"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
              :style="{ backgroundColor: project.color }"
            >
              <component :is="projectIcons[project.icon ?? 'folder']" class="h-4 w-4" />
            </span>
            <span class="text-body flex-1 truncate font-medium">{{ project.name }}</span>
          </div>

          <p v-if="project.description" class="text-meta text-muted-foreground line-clamp-2">
            {{ project.description }}
          </p>

          <div class="flex flex-col gap-1.5">
            <div class="text-caption text-muted-foreground flex items-center justify-between">
              <span>{{ progressFor(project.id).completed }} / {{ progressFor(project.id).total }} done</span>
              <span>{{ progressFor(project.id).percent }}%</span>
            </div>
            <Progress :model-value="progressFor(project.id).percent" />
          </div>
        </RouterLink>
      </li>
    </ul>

    <ProjectDialog v-model:open="dialogOpen" />
  </div>
</template>

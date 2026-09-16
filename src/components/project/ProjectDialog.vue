<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useProjects } from '@/composables/useProjects'
import type { Project } from '@/models'

import { projectIconKeys, projectIcons } from './projectIcons'

// A centered dialog rather than a side sheet (unlike TaskDrawer): a
// project has 4 simple fields, none of them the kind of long-lived,
// frequently-revisited editing surface a task is — an explicit
// Create/Save action fits a compact modal form better than replicating
// the drawer's debounced-autosave machinery for something this small.
const props = defineProps<{
  open: boolean
  /** Present = editing that project; absent = creating a new one. */
  project?: Project
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { createProject, updateProject } = useProjects()

const PALETTE = ['#4f46e5', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#2563eb', '#9333ea', '#db2777', '#57534e']

const name = ref<string | number>('')
const description = ref('')
const color = ref(PALETTE[0])
const icon = ref(projectIconKeys[0])
const submitting = ref(false)

const isEditing = computed(() => !!props.project)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = props.project?.name ?? ''
    description.value = props.project?.description ?? ''
    color.value = props.project?.color ?? PALETTE[0]
    icon.value = props.project?.icon ?? projectIconKeys[0]
  },
  { immediate: true },
)

async function handleSubmit() {
  const trimmedName = String(name.value).trim()
  if (!trimmedName) return
  submitting.value = true
  try {
    const fields = {
      name: trimmedName,
      description: description.value.trim() || undefined,
      color: color.value,
      icon: icon.value,
    }
    if (props.project) {
      await updateProject(props.project.id, fields)
    } else {
      await createProject(fields)
    }
    emit('update:open', false)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Edit project' : 'New project' }}</DialogTitle>
        <DialogDescription>Projects are lightweight containers for related tasks.</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label for="project-name">Name</Label>
          <Input id="project-name" v-model="name" placeholder="Project name" />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="project-description">Description</Label>
          <Textarea id="project-description" v-model="description" placeholder="What's this project about?" />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>Color</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="swatch in PALETTE"
              :key="swatch"
              type="button"
              :aria-label="`Choose color ${swatch}`"
              :aria-pressed="color === swatch"
              class="ring-offset-background h-7 w-7 rounded-full ring-offset-2 transition-shadow"
              :class="color === swatch ? 'ring-foreground ring-2' : ''"
              :style="{ backgroundColor: swatch }"
              @click="color = swatch"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>Icon</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="key in projectIconKeys"
              :key="key"
              type="button"
              :aria-label="`Choose icon ${key}`"
              :aria-pressed="icon === key"
              class="border-border flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
              :class="icon === key ? 'border-primary bg-accent' : 'hover:bg-accent'"
              @click="icon = key"
            >
              <component :is="projectIcons[key]" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!String(name).trim() || submitting" @click="handleSubmit">
          {{ isEditing ? 'Save' : 'Create' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import * as dataService from '@/services/dataService'
import type { ExportedData } from '@/services/dataService'

const exporting = ref(false)
const importing = ref(false)
const importError = ref('')

const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingImportFile = ref<File | null>(null)
// shallowRef, not ref: a plain `ref()` would deep-wrap the parsed object in
// a reactive Proxy, and IndexedDB's structured-clone algorithm (which
// Dexie's bulkAdd relies on) can't clone a Proxy — it throws a
// DataCloneError at import time. Nothing here needs this to be deeply
// reactive (it's only ever read whole, never rendered field-by-field), so
// shallowRef (reactive on reassignment, but stores the raw value as-is)
// is both correct and the right level of reactivity.
const pendingImportData = shallowRef<ExportedData | null>(null)
const confirmImportOpen = ref(false)
const confirmClearOpen = ref(false)

async function handleExport() {
  exporting.value = true
  try {
    const data = await dataService.exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sora-backup-${data.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

function openFilePicker() {
  fileInputRef.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importError.value = ''
  try {
    const parsed = JSON.parse(await file.text()) as unknown
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as ExportedData).version !== 1 ||
      !(parsed as ExportedData).tables
    ) {
      importError.value = "This doesn't look like a Sora backup file."
      return
    }
    pendingImportFile.value = file
    pendingImportData.value = parsed as ExportedData
    confirmImportOpen.value = true
  } catch {
    importError.value = 'Could not read that file — is it valid JSON?'
  }
}

async function handleConfirmImport() {
  if (!pendingImportData.value) return
  importing.value = true
  try {
    await dataService.importAllData(pendingImportData.value)
    confirmImportOpen.value = false
  } finally {
    importing.value = false
    pendingImportFile.value = null
    pendingImportData.value = null
  }
}

async function handleClearData() {
  await dataService.clearAllData()
  confirmClearOpen.value = false
}
</script>

<template>
  <section class="flex flex-col gap-8">
    <div class="flex flex-col gap-2">
      <h2 class="text-secondary text-muted-foreground font-medium">Export &amp; backup</h2>
      <p class="text-caption text-muted-foreground">
        Downloads everything — tasks, projects, plans, recurring rules, reminders, and completion history — as one
        JSON file. There's no server in this app to back up to automatically, so this file <em>is</em> your backup;
        keep it somewhere safe.
      </p>
      <Button class="self-start" :disabled="exporting" @click="handleExport">
        {{ exporting ? 'Preparing…' : 'Download backup (.json)' }}
      </Button>
    </div>

    <div class="border-border flex flex-col gap-2 border-t pt-6">
      <h2 class="text-secondary text-muted-foreground font-medium">Import</h2>
      <p class="text-caption text-muted-foreground">
        Restores from a previously exported file. This <strong>replaces</strong> everything currently in the app —
        it's meant for restoring a backup or moving to a new device, not merging two separate sets of data.
      </p>
      <input ref="fileInputRef" type="file" accept="application/json" class="hidden" @change="onFileSelected" />
      <Button variant="outline" class="self-start" @click="openFilePicker">Choose backup file…</Button>
      <p v-if="importError" class="text-caption text-priority-urgent">{{ importError }}</p>
    </div>

    <div class="border-border flex flex-col gap-2 border-t pt-6">
      <h2 class="text-priority-urgent font-medium">Clear all data</h2>
      <p class="text-caption text-muted-foreground">
        Permanently deletes everything on this device — including completion history, since a "reset" that kept
        your analytics wouldn't really be a reset. This cannot be undone. Your appearance and notification
        preferences aren't affected.
      </p>
      <Button variant="destructive" class="self-start" @click="confirmClearOpen = true">Clear all data</Button>
    </div>

    <Dialog v-model:open="confirmImportOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace all data with this backup?</DialogTitle>
          <DialogDescription>
            Everything currently in the app will be deleted and replaced with the contents of
            "{{ pendingImportFile?.name }}". This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="confirmImportOpen = false">Cancel</Button>
          <Button variant="destructive" :disabled="importing" @click="handleConfirmImport">
            {{ importing ? 'Restoring…' : 'Replace data' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="confirmClearOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear all data?</DialogTitle>
          <DialogDescription>
            This permanently deletes every task, project, plan, recurring rule, reminder, and completion record.
            There's no undo — export a backup first if you're not sure.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="confirmClearOpen = false">Cancel</Button>
          <Button variant="destructive" @click="handleClearData">Clear everything</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>

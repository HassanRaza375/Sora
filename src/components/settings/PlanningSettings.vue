<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import { ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAvailability } from '@/composables/useAvailability'
import type { TimeRange } from '@/models'
import { todayIso } from '@/utils/date'

// Moved here from the standalone PlanningView.vue/`/planning` route
// (Phase 8) now that Settings exists to give it a real home, per the
// spec's own Settings > Planning grouping — see CLAUDE.md's Phase 12
// notes. Logic is unchanged from Phase 8; only the page-level wrapper
// (this used to be a full view with its own <h1>) was dropped since
// SettingsView.vue now provides that chrome.
const { scheduleFor, unavailablePeriods, upsertSchedule, createUnavailablePeriod, deleteUnavailablePeriod } =
  useAvailability()

// Displayed Monday-first (common week-start convention), independent of
// the model's Sun=0..Sat=6 weekday numbering, which stays untouched.
const WEEKDAYS = [
  { weekday: 1, label: 'Monday' },
  { weekday: 2, label: 'Tuesday' },
  { weekday: 3, label: 'Wednesday' },
  { weekday: 4, label: 'Thursday' },
  { weekday: 5, label: 'Friday' },
  { weekday: 6, label: 'Saturday' },
  { weekday: 0, label: 'Sunday' },
]

function onWorkStartChange(weekday: number, value: unknown) {
  void upsertSchedule(weekday, { workStart: String(value) })
}
function onWorkEndChange(weekday: number, value: unknown) {
  void upsertSchedule(weekday, { workEnd: String(value) })
}

function addBreak(weekday: number, breaks: TimeRange[]) {
  void upsertSchedule(weekday, { breaks: [...breaks, { start: '12:00', end: '12:30' }] })
}
function updateBreak(weekday: number, breaks: TimeRange[], index: number, field: 'start' | 'end', value: unknown) {
  const next = breaks.map((brk, i) => (i === index ? { ...brk, [field]: String(value) } : brk))
  void upsertSchedule(weekday, { breaks: next })
}
function removeBreak(weekday: number, breaks: TimeRange[], index: number) {
  void upsertSchedule(
    weekday,
    { breaks: breaks.filter((_, i) => i !== index) },
  )
}

// Typed as `string | number` (not plain `string`) to match Input's own
// broad model type — narrower local refs fail v-model's type-check
// against it (see CLAUDE.md's Input/Textarea note); coerced back to
// string at the service-call boundary below.
const newPeriodLabel = ref<string | number>('')
const newPeriodStart = ref<string | number>(todayIso())
const newPeriodEnd = ref<string | number>(todayIso())

async function handleAddPeriod() {
  const startDate = String(newPeriodStart.value)
  const endDate = String(newPeriodEnd.value)
  if (!startDate || !endDate || endDate < startDate) return
  await createUnavailablePeriod({
    startDate,
    endDate,
    label: String(newPeriodLabel.value).trim() || undefined,
  })
  newPeriodLabel.value = ''
  newPeriodStart.value = todayIso()
  newPeriodEnd.value = todayIso()
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-meta text-muted-foreground font-medium">Weekly availability</h2>
        <p class="text-caption text-muted-foreground">
          Working hours and breaks — used to figure out how much you can fit into a day.
        </p>
      </div>

      <div class="border-border divide-border bg-card flex flex-col divide-y overflow-hidden rounded-lg border">
        <div v-for="day in WEEKDAYS" :key="day.weekday" class="flex flex-col gap-3 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="text-body w-24 shrink-0 font-medium">{{ day.label }}</span>

            <div class="flex items-center gap-2">
              <Input
                :model-value="scheduleFor(day.weekday).workStart"
                type="time"
                class="w-32"
                @update:model-value="(value) => onWorkStartChange(day.weekday, value)"
              />
              <span class="text-caption text-muted-foreground">to</span>
              <Input
                :model-value="scheduleFor(day.weekday).workEnd"
                type="time"
                class="w-32"
                @update:model-value="(value) => onWorkEndChange(day.weekday, value)"
              />
            </div>
          </div>

          <div v-if="scheduleFor(day.weekday).breaks.length > 0" class="flex flex-col gap-2 pl-0 sm:pl-24">
            <div
              v-for="(brk, index) in scheduleFor(day.weekday).breaks"
              :key="index"
              class="flex items-center gap-2"
            >
              <span class="text-caption text-muted-foreground w-10 shrink-0">Break</span>
              <Input
                :model-value="brk.start"
                type="time"
                class="w-32"
                @update:model-value="(value) => updateBreak(day.weekday, scheduleFor(day.weekday).breaks, index, 'start', value)"
              />
              <span class="text-caption text-muted-foreground">to</span>
              <Input
                :model-value="brk.end"
                type="time"
                class="w-32"
                @update:model-value="(value) => updateBreak(day.weekday, scheduleFor(day.weekday).breaks, index, 'end', value)"
              />
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                aria-label="Remove break"
                @click="removeBreak(day.weekday, scheduleFor(day.weekday).breaks, index)"
              >
                <X class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div class="pl-0 sm:pl-24">
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground gap-1.5"
              @click="addBreak(day.weekday, scheduleFor(day.weekday).breaks)"
            >
              <Plus class="h-3.5 w-3.5" />
              Add break
            </Button>
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-meta text-muted-foreground font-medium">Unavailable periods</h2>
      <p class="text-caption text-muted-foreground">
        Whole days blocked out entirely — vacations, holidays, anything that leaves zero capacity.
      </p>

      <ul v-if="unavailablePeriods.length > 0" class="border-border divide-border bg-card divide-y overflow-hidden rounded-lg border">
        <li v-for="period in unavailablePeriods" :key="period.id" class="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p class="text-body">{{ period.label || 'Unavailable' }}</p>
            <p class="text-caption text-muted-foreground">
              {{ format(parseISO(period.startDate), 'MMM d, yyyy') }} – {{ format(parseISO(period.endDate), 'MMM d, yyyy') }}
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Remove period" @click="deleteUnavailablePeriod(period.id)">
            <X class="h-4 w-4" />
          </Button>
        </li>
      </ul>

      <form class="border-border bg-card flex flex-wrap items-end gap-3 rounded-lg border p-4" @submit.prevent="handleAddPeriod">
        <div class="flex flex-col gap-1.5">
          <Label for="period-label">Label (optional)</Label>
          <Input id="period-label" v-model="newPeriodLabel" placeholder="Vacation" class="w-40" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="period-start">Start</Label>
          <Input id="period-start" v-model="newPeriodStart" type="date" class="w-40" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="period-end">End</Label>
          <Input id="period-end" v-model="newPeriodEnd" type="date" class="w-40" />
        </div>
        <Button type="submit" class="gap-1.5">
          <Plus class="h-4 w-4" />
          Add
        </Button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue'
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useProjects } from '@/composables/useProjects'
import { useRecurrence, useRecurringRule } from '@/composables/useRecurrence'
import { useReminderForTask, useReminders } from '@/composables/useReminders'
import { useTask, useTasks } from '@/composables/useTasks'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { cn } from '@/lib/utils'
import type { Priority, RecurrenceFrequency, ReminderOffset, TaskStatus } from '@/models'
import type { RulePatternInput } from '@/services/recurrenceService'
import type { TaskPatch } from '@/services/taskService'
import { debounce } from '@/utils/debounce'
import { isoToDatetimeLocalValue, todayIso } from '@/utils/date'

// Sentinel for the "no project" / "no priority" option — reka-ui's Select
// doesn't allow an empty-string item value, so we translate this back to
// `undefined` at the read/write boundary instead.
const NONE = '__none__'

const { isOpen, taskId, closeTaskDrawer } = useTaskDrawer()
const { task, subtasks } = useTask(taskId)
const { updateTask, setTaskStatus, deleteTask, addSubtask, toggleSubtask, removeSubtask } = useTasks()
const { projects } = useProjects()
const { rule: recurringRule } = useRecurringRule(computed(() => task.value?.recurringRuleId))
const { createRuleForTask, updateRulePattern, setRuleActive } = useRecurrence()
const { reminder: existingReminder } = useReminderForTask(taskId)
const { upsertReminderForTask, removeReminderForTask, snoozeReminder } = useReminders()

// Local form state mirrors the loaded task once, then is the source of
// truth for the inputs — autosaves push edits back out, but incoming
// liveQuery echoes of our own writes don't fight the user's typing.
const title = ref<string | number>('')
const notes = ref('')
const estimatedDuration = ref<string | number>(0)
const dueDate = ref<string | number>('')
const dueTime = ref<string | number>('')
const projectId = ref<string | undefined>(undefined)
const priority = ref<Priority | undefined>(undefined)
const status = ref<TaskStatus>('todo')
const today = ref(false)
const createdViaDraft = ref(false)

// Recurrence pattern fields. Unlike the fields above, these don't need an
// `initialized` gate against live-query echoes overwriting concurrent
// typing — nothing here writes to Dexie until the explicit action button
// below is clicked (see handleRecurrenceAction), so re-seeding from every
// `recurringRule` emission (including the one caused by our own write) is
// harmless and keeps the form as a straightforward mirror of Dexie.
const RECURRENCE_NONE = 'none'
type RecurrenceSelection = RecurrenceFrequency | typeof RECURRENCE_NONE
const recurrenceFrequency = ref<RecurrenceSelection>(RECURRENCE_NONE)
const recurrenceInterval = ref<string | number>(2)
const recurrenceWeekdays = ref<number[]>([])
const recurrenceDayOfMonth = ref<string | number>(1)
const recurrenceMonth = ref<string | number>(0)

// `label` is the single-letter visible glyph; `name` is only for
// aria-label, since "T"/"S" alone are ambiguous between Tue/Thu and
// Sat/Sun for a screen reader (a sighted user has position/spacing to
// disambiguate, that cue doesn't exist non-visually).
const WEEKDAY_OPTIONS = [
  { value: 1, label: 'M', name: 'Monday' },
  { value: 2, label: 'T', name: 'Tuesday' },
  { value: 3, label: 'W', name: 'Wednesday' },
  { value: 4, label: 'T', name: 'Thursday' },
  { value: 5, label: 'F', name: 'Friday' },
  { value: 6, label: 'S', name: 'Saturday' },
  { value: 0, label: 'S', name: 'Sunday' },
]
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

watch(
  recurringRule,
  (loaded) => {
    recurrenceFrequency.value = loaded?.frequency ?? RECURRENCE_NONE
    recurrenceInterval.value = loaded?.interval ?? 2
    recurrenceWeekdays.value = loaded?.weekdaysMask ?? []
    recurrenceDayOfMonth.value = loaded?.dayOfMonth ?? 1
    recurrenceMonth.value = loaded?.month ?? 0
  },
  { immediate: true },
)

function onFrequencyChange(value: unknown) {
  if (typeof value === 'string') recurrenceFrequency.value = value as RecurrenceSelection
}

function toggleWeekday(day: number) {
  recurrenceWeekdays.value = recurrenceWeekdays.value.includes(day)
    ? recurrenceWeekdays.value.filter((d) => d !== day)
    : [...recurrenceWeekdays.value, day].sort((a, b) => a - b)
}

function buildRecurrencePattern(): RulePatternInput | undefined {
  if (recurrenceFrequency.value === RECURRENCE_NONE) return undefined
  return {
    frequency: recurrenceFrequency.value,
    interval: recurrenceFrequency.value === 'interval' ? Number(recurrenceInterval.value) || 1 : undefined,
    weekdaysMask: recurrenceFrequency.value === 'specificWeekdays' ? recurrenceWeekdays.value : undefined,
    dayOfMonth:
      recurrenceFrequency.value === 'monthly' || recurrenceFrequency.value === 'yearly'
        ? Number(recurrenceDayOfMonth.value) || 1
        : undefined,
    month: recurrenceFrequency.value === 'yearly' ? Number(recurrenceMonth.value) || 0 : undefined,
  }
}

// "" (no rule yet, "None" picked) -> no button. Otherwise: creating,
// updating an existing rule's pattern, or pausing it via the "None"
// option — see CLAUDE.md's Planning/Recurring notes for why pausing
// (never deleting) is the only way "None" removes recurrence.
const recurrenceActionLabel = computed(() => {
  if (recurrenceFrequency.value === RECURRENCE_NONE) return recurringRule.value ? 'Remove recurrence' : ''
  return recurringRule.value ? 'Update recurrence' : 'Set recurrence'
})

async function handleRecurrenceAction() {
  if (!taskId.value) return

  if (recurrenceFrequency.value === RECURRENCE_NONE) {
    if (recurringRule.value) await setRuleActive(recurringRule.value.id, false)
    return
  }

  const pattern = buildRecurrencePattern()
  if (!pattern) return

  if (recurringRule.value) {
    await updateRulePattern(recurringRule.value.id, pattern, taskId.value)
  } else {
    const hadNoDueDate = !dueDate.value
    await createRuleForTask(taskId.value, pattern)
    // createRuleForTask anchors the rule to this task's due date, setting
    // one (to today) if it didn't have one — mirror that locally so the
    // due-date field doesn't show stale/empty until the drawer reopens.
    if (hadNoDueDate) dueDate.value = todayIso()
  }
}

async function handleToggleRuleActive() {
  if (!recurringRule.value) return
  await setRuleActive(recurringRule.value.id, !recurringRule.value.active)
}

// Reminder fields. Same "no initialized-gate needed" reasoning as
// recurrence above — nothing writes until the explicit action button.
const REMINDER_NONE = 'none'
type ReminderSelection = ReminderOffset | typeof REMINDER_NONE
const reminderOffset = ref<ReminderSelection>(REMINDER_NONE)
// datetime-local's own value format, seeded from the reminder's stored
// absolute triggerAt when offsetType is 'custom' — see isoToDatetimeLocalValue.
const reminderCustomAt = ref<string>('')

watch(
  existingReminder,
  (loaded) => {
    reminderOffset.value = loaded?.offsetType ?? REMINDER_NONE
    reminderCustomAt.value = loaded && loaded.offsetType === 'custom' ? isoToDatetimeLocalValue(loaded.triggerAt) : ''
  },
  { immediate: true },
)

function onReminderOffsetChange(value: unknown) {
  if (typeof value === 'string') reminderOffset.value = value as ReminderSelection
}

// The preset offsets (due time / N before) need a specific due TIME to
// compute an absolute trigger instant from, not just a due date — "custom"
// sidesteps this by letting the user pick an absolute date+time directly.
const reminderBlockedReason = computed(() => {
  if (reminderOffset.value === REMINDER_NONE || reminderOffset.value === 'custom') return undefined
  if (!dueDate.value || !dueTime.value) return 'Set a due date and time to use this reminder option.'
  return undefined
})

const reminderActionLabel = computed(() => {
  if (reminderOffset.value === REMINDER_NONE) return existingReminder.value ? 'Remove reminder' : ''
  return existingReminder.value ? 'Update reminder' : 'Set reminder'
})

const REMINDER_STATUS_LABEL: Record<string, string> = {
  fired: 'Fired',
  dismissed: 'Dismissed',
}

const reminderStatusLabel = computed(() => {
  const reminder = existingReminder.value
  if (!reminder) return ''
  if (reminder.status === 'pending') return `Pending — ${format(parseISO(reminder.triggerAt), 'MMM d, h:mm a')}`
  if (reminder.status === 'snoozed' && reminder.snoozedUntil) {
    return `Snoozed until ${format(parseISO(reminder.snoozedUntil), 'MMM d, h:mm a')}`
  }
  return REMINDER_STATUS_LABEL[reminder.status] ?? ''
})

async function handleReminderAction() {
  if (!taskId.value) return

  if (reminderOffset.value === REMINDER_NONE) {
    if (existingReminder.value) await removeReminderForTask(taskId.value)
    return
  }
  if (reminderBlockedReason.value) return

  // Requested here — from the explicit "Set/Update reminder" action —
  // rather than proactively on app load, per the spec's "first use" intent.
  // A denied/blocked permission still lets the reminder save; it just
  // won't show a visible Notification when it fires (see
  // useReminderScheduler.ts).
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  const customTriggerAt =
    reminderOffset.value === 'custom' && reminderCustomAt.value ? new Date(reminderCustomAt.value).toISOString() : undefined

  await upsertReminderForTask(
    taskId.value,
    { offsetType: reminderOffset.value, customTriggerAt },
    dueDate.value ? String(dueDate.value) : undefined,
    dueTime.value ? String(dueTime.value) : undefined,
  )
}

async function handleSnoozeReminder() {
  if (!existingReminder.value) return
  await snoozeReminder(existingReminder.value.id, 10)
}

let initialized = false

// Fires on every task switch, including the drawer closing (taskId -> undefined)
// via ANY path — the explicit close button, Escape/overlay-click, or a real
// browser back navigation, none of which call closeTaskDrawer() directly in
// the back-button case. That's why this cleanup lives here reacting to the
// state change, not inside closeTaskDrawer() itself.
//
// It reads the LOCAL title/createdViaDraft refs, not a fresh Dexie fetch —
// title's Dexie write is debounced ~400ms, so re-fetching here could still
// see a stale empty title for a task the user just named and immediately
// closed. The local ref is always current since it updates on every
// keystroke regardless of when the debounced save flushes.
watch(taskId, (_newId, oldId) => {
  if (oldId && createdViaDraft.value && String(title.value).trim().length === 0) {
    void deleteTask(oldId)
  }
  initialized = false
})

watch(
  task,
  (loaded) => {
    if (!loaded || initialized) return
    title.value = loaded.title
    notes.value = loaded.notes ?? ''
    estimatedDuration.value = loaded.estimatedDuration
    dueDate.value = loaded.dueDate ?? ''
    dueTime.value = loaded.dueTime ?? ''
    projectId.value = loaded.projectId
    priority.value = loaded.priority
    status.value = loaded.status
    today.value = loaded.today
    createdViaDraft.value = loaded.createdViaDraft
    initialized = true
  },
  { immediate: true },
)

function patchNow(fields: TaskPatch) {
  if (!taskId.value) return
  void updateTask(taskId.value, fields)
}

// The debounced saves take the target id as an argument, captured at the
// moment each keystroke schedules the save — NOT read from `taskId.value`
// when the timer eventually fires. If they read `taskId.value` at fire
// time instead, closing (or switching tasks) within the 400ms window
// would silently drop the save: by the time the timer fires, taskId.value
// no longer points at the task the edit was actually for.
const saveTitle = debounce((id: string, value: string) => void updateTask(id, { title: value }), 400)
const saveNotes = debounce((id: string, value: string) => void updateTask(id, { notes: value }), 400)
const saveDuration = debounce((id: string, value: number) => void updateTask(id, { estimatedDuration: value }), 400)
const saveDueDate = debounce((id: string, value: string | undefined) => void updateTask(id, { dueDate: value }), 400)
const saveDueTime = debounce((id: string, value: string | undefined) => void updateTask(id, { dueTime: value }), 400)

watch(title, (value) => {
  if (initialized && taskId.value) saveTitle(taskId.value, String(value))
})
watch(notes, (value) => {
  if (initialized && taskId.value) saveNotes(taskId.value, value)
})
watch(estimatedDuration, (value) => {
  if (initialized && taskId.value) saveDuration(taskId.value, Number(value) || 0)
})
watch(dueDate, (value) => {
  if (initialized && taskId.value) saveDueDate(taskId.value, value ? String(value) : undefined)
})
watch(dueTime, (value) => {
  if (initialized && taskId.value) saveDueTime(taskId.value, value ? String(value) : undefined)
})

function onProjectChange(value: unknown) {
  const next = typeof value === 'string' && value !== NONE ? value : undefined
  projectId.value = next
  patchNow({ projectId: next })
}

function onPriorityChange(value: unknown) {
  const next = typeof value === 'string' && value !== NONE ? (value as Priority) : undefined
  priority.value = next
  patchNow({ priority: next })
}

function onStatusChange(value: unknown) {
  if (typeof value !== 'string') return
  status.value = value as TaskStatus
  if (taskId.value) void setTaskStatus(taskId.value, value as TaskStatus)
}

function onTodayChange(value: boolean | 'indeterminate') {
  const next = value === true
  today.value = next
  patchNow({ today: next })
}

const newSubtaskTitle = ref('')

async function handleAddSubtask() {
  const value = newSubtaskTitle.value.trim()
  if (!value || !taskId.value) return
  await addSubtask(taskId.value, value)
  newSubtaskTitle.value = ''
}

function handleOpenChange(open: boolean) {
  if (!open) closeTaskDrawer()
}
</script>

<template>
  <Sheet :open="isOpen" @update:open="handleOpenChange">
    <SheetContent side="right" class="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
      <SheetHeader class="flex-row items-start justify-between gap-4 space-y-0 pr-8">
        <div class="flex flex-col gap-1.5">
          <SheetTitle>{{ title || 'New task' }}</SheetTitle>
          <SheetDescription>Saved automatically as you type — Done just closes this panel.</SheetDescription>
        </div>
        <!-- The only other way to close this drawer is the small X in the
             corner, which reads as "cancel" even though nothing here is
             ever cancelled (fields autosave on every change, no separate
             submit step exists to skip). A real, labeled button removes
             that ambiguity for anyone opening the drawer for the first
             time, without changing the underlying autosave behavior at
             all — this is the exact same close path as the X/Escape/
             overlay-click, just given a clearer, more prominent name. -->
        <Button size="sm" class="shrink-0" @click="closeTaskDrawer">Done</Button>
      </SheetHeader>

      <section class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label for="task-title">Title</Label>
          <Input id="task-title" v-model="title" placeholder="Task title" />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label>Project</Label>
          <Select :model-value="projectId ?? NONE" @update:model-value="onProjectChange">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NONE">No project</SelectItem>
              <SelectItem v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select :model-value="priority ?? NONE" @update:model-value="onPriorityChange">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="NONE">None</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select :model-value="status" @update:model-value="onStatusChange">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Checkbox id="task-today" :model-value="today" @update:model-value="onTodayChange" />
          <Label for="task-today">Today</Label>
        </div>
      </section>

      <section class="border-border flex flex-col gap-4 border-t pt-4">
        <h3 class="text-meta text-muted-foreground font-medium">Schedule</h3>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <Label for="task-due-date">Due date</Label>
            <Input id="task-due-date" v-model="dueDate" type="date" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="task-due-time">Due time</Label>
            <Input id="task-due-time" v-model="dueTime" type="time" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="task-duration">Duration (min)</Label>
          <Input id="task-duration" v-model="estimatedDuration" type="number" min="0" step="5" />
        </div>

        <div class="flex flex-col gap-2">
          <Label>Reminder</Label>

          <Select :model-value="reminderOffset" @update:model-value="onReminderOffsetChange">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No reminder</SelectItem>
              <SelectItem value="due">At due time</SelectItem>
              <SelectItem value="5m">5 minutes before</SelectItem>
              <SelectItem value="15m">15 minutes before</SelectItem>
              <SelectItem value="30m">30 minutes before</SelectItem>
              <SelectItem value="1h">1 hour before</SelectItem>
              <SelectItem value="1d">1 day before</SelectItem>
              <SelectItem value="custom">Custom time</SelectItem>
            </SelectContent>
          </Select>

          <Input v-if="reminderOffset === 'custom'" v-model="reminderCustomAt" type="datetime-local" />

          <p v-if="reminderBlockedReason" class="text-caption text-priority-urgent">{{ reminderBlockedReason }}</p>
          <p v-else-if="existingReminder" class="text-caption text-muted-foreground">{{ reminderStatusLabel }}</p>

          <div class="flex items-center gap-2">
            <Button
              v-if="reminderActionLabel"
              variant="secondary"
              size="sm"
              :disabled="!!reminderBlockedReason"
              @click="handleReminderAction"
            >
              {{ reminderActionLabel }}
            </Button>
            <Button
              v-if="existingReminder && (existingReminder.status === 'fired' || existingReminder.status === 'snoozed')"
              variant="outline"
              size="sm"
              @click="handleSnoozeReminder"
            >
              Snooze 10 min
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Label>Recurrence</Label>
            <button
              v-if="recurringRule"
              type="button"
              class="text-caption text-muted-foreground hover:text-foreground hover:underline"
              @click="handleToggleRuleActive"
            >
              {{ recurringRule.active ? 'Pause' : 'Resume' }}
            </button>
          </div>

          <Select :model-value="recurrenceFrequency" @update:model-value="onFrequencyChange">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Does not repeat</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="weekdays">Every weekday</SelectItem>
              <SelectItem value="specificWeekdays">Specific weekdays</SelectItem>
              <SelectItem value="interval">Every few days</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <div v-if="recurrenceFrequency === 'interval'" class="flex items-center gap-2">
            <span class="text-caption text-muted-foreground">Every</span>
            <Input
              :model-value="recurrenceInterval"
              type="number"
              min="1"
              class="w-20"
              @update:model-value="(value) => (recurrenceInterval = value ?? 1)"
            />
            <span class="text-caption text-muted-foreground">days</span>
          </div>

          <div v-if="recurrenceFrequency === 'specificWeekdays'" class="flex flex-wrap gap-1.5">
            <button
              v-for="option in WEEKDAY_OPTIONS"
              :key="option.value"
              type="button"
              :aria-label="option.name"
              :aria-pressed="recurrenceWeekdays.includes(option.value)"
              :class="
                cn(
                  'border-input text-muted-foreground h-8 w-8 rounded-full border text-xs font-medium transition-colors',
                  recurrenceWeekdays.includes(option.value) && 'bg-primary text-primary-foreground border-primary',
                )
              "
              @click="toggleWeekday(option.value)"
            >
              {{ option.label }}
            </button>
          </div>

          <div v-if="recurrenceFrequency === 'monthly' || recurrenceFrequency === 'yearly'" class="flex items-center gap-2">
            <span class="text-caption text-muted-foreground">Day</span>
            <Input
              :model-value="recurrenceDayOfMonth"
              type="number"
              min="1"
              max="31"
              class="w-20"
              @update:model-value="(value) => (recurrenceDayOfMonth = value ?? 1)"
            />
            <template v-if="recurrenceFrequency === 'yearly'">
              <span class="text-caption text-muted-foreground">of</span>
              <Select :model-value="String(recurrenceMonth)" @update:model-value="(value) => (recurrenceMonth = Number(value))">
                <SelectTrigger class="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="(name, index) in MONTH_NAMES" :key="index" :value="String(index)">
                    {{ name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </template>
          </div>

          <p v-if="recurringRule" class="text-caption text-muted-foreground">
            {{ recurringRule.active ? 'Active' : 'Paused' }} — started
            {{ format(parseISO(recurringRule.startDate), 'MMM d, yyyy') }}
          </p>

          <Button v-if="recurrenceActionLabel" variant="secondary" size="sm" class="self-start" @click="handleRecurrenceAction">
            {{ recurrenceActionLabel }}
          </Button>
        </div>
      </section>

      <section class="border-border flex flex-col gap-4 border-t pt-4">
        <h3 class="text-meta text-muted-foreground font-medium">Details</h3>

        <div class="flex flex-col gap-1.5">
          <Label for="task-notes">Notes</Label>
          <Textarea id="task-notes" v-model="notes" placeholder="Notes" />
        </div>

        <div class="flex flex-col gap-2">
          <Label>Subtasks</Label>
          <ul class="flex flex-col gap-1.5">
            <li v-for="subtask in subtasks" :key="subtask.id" class="flex items-center gap-2">
              <Checkbox :model-value="subtask.done" @update:model-value="() => toggleSubtask(subtask.id)" />
              <span :class="cn('text-body flex-1 transition-colors', subtask.done && 'text-muted-foreground line-through')">
                {{ subtask.title }}
              </span>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="removeSubtask(subtask.id)">
                <X class="h-3.5 w-3.5" />
                <span class="sr-only">Remove subtask</span>
              </Button>
            </li>
          </ul>

          <form class="flex gap-2" @submit.prevent="handleAddSubtask">
            <Input v-model="newSubtaskTitle" placeholder="Add a subtask" />
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        </div>
      </section>
    </SheetContent>
  </Sheet>
</template>

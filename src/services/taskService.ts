import { db } from '@/services/db'
import type { CompletionHistoryEntry, Priority, RecurringInstanceStatus, Subtask, Task, TaskStatus } from '@/models'
import { createId } from '@/utils/id'
import { todayIso } from '@/utils/date'

export interface NewTaskInput {
  title: string
  estimatedDuration: number
  projectId?: string
  priority?: Priority
  dueDate?: string
  dueTime?: string
  today?: boolean
  notes?: string
  /** Set by recurrenceService when this task is a generated occurrence — see Task.recurringRuleId. */
  recurringRuleId?: string
  /** Only createDraftTask() should pass true — see Task.createdViaDraft. */
  createdViaDraft?: boolean
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'estimatedDuration' | 'projectId' | 'priority' | 'dueDate' | 'dueTime' | 'today' | 'notes'>
>

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Excludes empty-title drafts (see createDraftTask) so every list view
 * (Inbox, Tasks, Today, ...) automatically hides a task the user hasn't
 * named yet, without each caller needing to remember to filter it out.
 */
export async function listTasks(): Promise<Task[]> {
  const tasks = await db.tasks.orderBy('createdAt').reverse().toArray()
  return tasks.filter((task) => task.title.trim().length > 0)
}

export function getTask(id: string): Promise<Task | undefined> {
  return db.tasks.get(id)
}

export function listSubtasks(taskId: string): Promise<Subtask[]> {
  return db.subtasks.where('taskId').equals(taskId).sortBy('order')
}

/**
 * Creates the empty-title row the task drawer opens against for "new task"
 * mode, so create and edit both autosave through the same updateTask path
 * instead of the drawer holding separate local-only state for a draft.
 */
export function createDraftTask(): Promise<Task> {
  return createTask({ title: '', estimatedDuration: 0, createdViaDraft: true })
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const timestamp = nowIso()
  const task: Task = {
    id: createId(),
    title: input.title,
    estimatedDuration: input.estimatedDuration,
    projectId: input.projectId,
    priority: input.priority,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    // Deliberately NOT auto-true for a recurring instance (input.recurringRuleId
    // set) even though it has a dueDate — `today` stays a purely user-controlled
    // toggle, identical to a one-off task. See recurrenceService.ts.
    today: input.today ?? false,
    notes: input.notes,
    recurringRuleId: input.recurringRuleId,
    createdViaDraft: input.createdViaDraft ?? false,
    status: 'todo',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.tasks.add(task)
  return task
}

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  await db.tasks.update(id, { ...patch, updatedAt: nowIso() })
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const existing = await db.tasks.get(id)
  const wasAlreadyDone = existing?.status === 'done'

  await db.tasks.update(id, {
    status,
    completedAt: status === 'done' ? nowIso() : undefined,
    updatedAt: nowIso(),
  })

  // Appends the one and only write path for `completionHistory` — nothing
  // else in the codebase populates it, so without this Insights (Phase 11)
  // would have zero data forever. Fires only on a genuine todo/in_progress
  // -> done transition (not every call with status:'done', which would
  // double-log an already-done task), and snapshots the task's fields at
  // this moment — per the model's own doc comment — so a later edit or
  // delete can't retroactively skew history. `wasPlanned`/`planDate` are
  // set by checking whether this task is in *today's* DailyPlan (if one
  // exists): completing a task planned for today, today, is what "planned
  // and done" means for planning-accuracy purposes — completing it a day
  // late is a real planning miss, not a data omission, so it deliberately
  // does NOT check plans for other dates.
  if (status === 'done' && existing && !wasAlreadyDone) {
    const planDate = todayIso()
    const plan = await db.dailyPlans.get(planDate)
    const wasPlanned = !!plan?.items.some((item) => item.taskId === id)
    const entry: CompletionHistoryEntry = {
      id: createId(),
      taskId: id,
      projectId: existing.projectId,
      title: existing.title,
      priority: existing.priority,
      estimatedDuration: existing.estimatedDuration,
      completedAt: nowIso(),
      wasPlanned,
      planDate: wasPlanned ? planDate : undefined,
    }
    await db.completionHistory.add(entry)
  }

  // Keep the linked RecurringInstance's status in sync so a future Insights
  // "recurring task completion" metric (Phase 11) reads real data instead of
  // every instance being permanently stuck at 'pending'. taskService reaches
  // into `recurringInstances` directly (rather than importing
  // recurrenceService) since it already has `db` and this is a one-line
  // lookup, not enough surface to justify a cross-service dependency.
  const instance = await db.recurringInstances.where('taskId').equals(id).first()
  if (instance) {
    const instanceStatus: RecurringInstanceStatus = status === 'done' ? 'completed' : 'pending'
    await db.recurringInstances.update(instance.id, { status: instanceStatus })
  }

  // Completing a task cancels any reminder still waiting to fire for it —
  // same direct-narrow-lookup cascade as the RecurringInstance sync above,
  // not an import of reminderService. Reminders are soft-cancelled
  // (status: 'dismissed'), not deleted, since the row itself is a small,
  // harmless record and the model already has a 'dismissed' status built
  // for exactly this. Un-completing a task does NOT un-dismiss a reminder
  // — once cancelled, it stays cancelled; the user would set a new one.
  if (status === 'done') {
    const reminders = await db.reminders.where('taskId').equals(id).toArray()
    for (const reminder of reminders) {
      if (reminder.status === 'pending' || reminder.status === 'snoozed') {
        await db.reminders.update(reminder.id, { status: 'dismissed', snoozedUntil: undefined })
      }
    }
  }
}

export async function toggleToday(id: string): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, { today: !task.today, updatedAt: nowIso() })
}

export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', db.tasks, db.subtasks, db.reminders, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
    // Unlike completion's soft-cancel above, a deleted task's reminders are
    // hard-deleted in the same transaction as its subtasks — there's no
    // task left for a "dismissed" record to be about, and an orphaned
    // pending reminder would otherwise keep firing for a task that no
    // longer exists.
    await db.reminders.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
}

export async function addSubtask(taskId: string, title: string): Promise<Subtask> {
  const existing = await db.subtasks.where('taskId').equals(taskId).count()
  const subtask: Subtask = {
    id: createId(),
    taskId,
    title,
    done: false,
    order: existing,
  }
  await db.subtasks.add(subtask)
  return subtask
}

export async function toggleSubtask(id: string): Promise<void> {
  const subtask = await db.subtasks.get(id)
  if (!subtask) return
  await db.subtasks.update(id, { done: !subtask.done })
}

export async function removeSubtask(id: string): Promise<void> {
  await db.subtasks.delete(id)
}

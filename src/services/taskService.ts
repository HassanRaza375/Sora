import { db } from '@/services/db'
import type { Priority, Subtask, Task, TaskStatus } from '@/models'
import { createId } from '@/utils/id'

export interface NewTaskInput {
  title: string
  estimatedDuration: number
  projectId?: string
  priority?: Priority
  dueDate?: string
  dueTime?: string
  today?: boolean
  notes?: string
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'estimatedDuration' | 'projectId' | 'priority' | 'dueDate' | 'dueTime' | 'today' | 'notes'>
>

function nowIso(): string {
  return new Date().toISOString()
}

export function listTasks(): Promise<Task[]> {
  return db.tasks.orderBy('createdAt').reverse().toArray()
}

export function listSubtasks(taskId: string): Promise<Subtask[]> {
  return db.subtasks.where('taskId').equals(taskId).sortBy('order')
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
    today: input.today ?? false,
    notes: input.notes,
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
  await db.tasks.update(id, {
    status,
    completedAt: status === 'done' ? nowIso() : undefined,
    updatedAt: nowIso(),
  })
}

export async function toggleToday(id: string): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, { today: !task.today, updatedAt: nowIso() })
}

export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
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

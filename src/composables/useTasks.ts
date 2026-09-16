import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import type { Priority, TaskStatus } from '@/models'
import * as taskService from '@/services/taskService'
import type { NewTaskInput, TaskPatch } from '@/services/taskService'
import { todayIso } from '@/utils/date'

import { useLiveQuery } from './useLiveQuery'

/**
 * Live single-task + its subtasks, keyed by a reactive id (e.g. the task
 * drawer's current id). Unlike useTasks()'s list, this deliberately does
 * NOT go through listTasks' empty-title filter, since the drawer needs to
 * display/edit a draft before it has a title.
 */
export function useTask(taskId: MaybeRefOrGetter<string | undefined>) {
  const task = useLiveQuery(
    () => {
      const id = toValue(taskId)
      return id ? taskService.getTask(id) : Promise.resolve(undefined)
    },
    undefined,
    () => toValue(taskId),
  )

  const subtasks = useLiveQuery(
    () => {
      const id = toValue(taskId)
      return id ? taskService.listSubtasks(id) : Promise.resolve([])
    },
    [],
    () => toValue(taskId),
  )

  return { task, subtasks }
}

export function useTasks() {
  const tasks = useLiveQuery(() => taskService.listTasks(), [])

  // A task stays in the Inbox until it's given a project or a due date —
  // and leaves once completed, same as every other active view (spec:
  // "completed tasks leave active views").
  const inboxTasks = computed(() =>
    tasks.value.filter((task) => !task.projectId && !task.dueDate && task.status !== 'done'),
  )
  const inboxCount = computed(() => inboxTasks.value.length)
  const todayTasks = computed(() => tasks.value.filter((task) => task.today && task.status !== 'done'))
  const overdueTasks = computed(() => {
    const today = todayIso()
    return tasks.value.filter((task) => task.dueDate && task.dueDate < today && task.status !== 'done')
  })

  function byStatus(status: TaskStatus) {
    return tasks.value.filter((task) => task.status === status)
  }

  function byProject(projectId: string) {
    return tasks.value.filter((task) => task.projectId === projectId)
  }

  function byPriority(priority: Priority) {
    return tasks.value.filter((task) => task.priority === priority)
  }

  /** Inclusive on both ends; dates are YYYY-MM-DD strings so lexical comparison works. */
  function dueBetween(startDate: string, endDate: string) {
    return tasks.value.filter((task) => task.dueDate && task.dueDate >= startDate && task.dueDate <= endDate)
  }

  function withoutDueDate() {
    return tasks.value.filter((task) => !task.dueDate)
  }

  return {
    tasks,
    inboxTasks,
    inboxCount,
    todayTasks,
    overdueTasks,
    byStatus,
    byProject,
    byPriority,
    dueBetween,
    withoutDueDate,
    createTask: (input: NewTaskInput) => taskService.createTask(input),
    updateTask: (id: string, patch: TaskPatch) => taskService.updateTask(id, patch),
    setTaskStatus: (id: string, status: TaskStatus) => taskService.setTaskStatus(id, status),
    toggleToday: (id: string) => taskService.toggleToday(id),
    deleteTask: (id: string) => taskService.deleteTask(id),
    addSubtask: (taskId: string, title: string) => taskService.addSubtask(taskId, title),
    toggleSubtask: (id: string) => taskService.toggleSubtask(id),
    removeSubtask: (id: string) => taskService.removeSubtask(id),
  }
}

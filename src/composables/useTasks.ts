import { computed } from 'vue'

import type { TaskStatus } from '@/models'
import * as taskService from '@/services/taskService'
import type { NewTaskInput, TaskPatch } from '@/services/taskService'

import { useLiveQuery } from './useLiveQuery'

export function useTasks() {
  const tasks = useLiveQuery(() => taskService.listTasks(), [])

  // A task stays in the Inbox until it's given a project or a due date.
  const inboxTasks = computed(() => tasks.value.filter((task) => !task.projectId && !task.dueDate))
  const todayTasks = computed(() => tasks.value.filter((task) => task.today && task.status !== 'done'))
  const overdueTasks = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return tasks.value.filter((task) => task.dueDate && task.dueDate < today && task.status !== 'done')
  })

  function byStatus(status: TaskStatus) {
    return tasks.value.filter((task) => task.status === status)
  }

  function byProject(projectId: string) {
    return tasks.value.filter((task) => task.projectId === projectId)
  }

  return {
    tasks,
    inboxTasks,
    todayTasks,
    overdueTasks,
    byStatus,
    byProject,
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

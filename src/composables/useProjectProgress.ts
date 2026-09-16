import { computed } from 'vue'

import { useTasks } from './useTasks'

export interface ProjectProgress {
  total: number
  completed: number
  /** 0-100, rounded. 0 when the project has no tasks. */
  percent: number
}

const EMPTY: ProjectProgress = { total: 0, completed: 0, percent: 0 }

/**
 * Derived, not stored — a project's progress is always computed from its
 * current tasks rather than kept as a field on the Project record, so it
 * can never drift out of sync with the tasks themselves.
 */
export function useProjectProgress() {
  const { tasks } = useTasks()

  const progressByProjectId = computed(() => {
    const map: Record<string, ProjectProgress> = {}
    for (const task of tasks.value) {
      if (!task.projectId) continue
      const entry = (map[task.projectId] ??= { total: 0, completed: 0, percent: 0 })
      entry.total += 1
      if (task.status === 'done') entry.completed += 1
    }
    for (const key in map) {
      const entry = map[key]
      entry.percent = entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100)
    }
    return map
  })

  function progressFor(projectId: string): ProjectProgress {
    return progressByProjectId.value[projectId] ?? EMPTY
  }

  return { progressByProjectId, progressFor }
}

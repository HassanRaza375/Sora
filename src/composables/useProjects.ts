import * as projectService from '@/services/projectService'
import type { NewProjectInput, ProjectPatch } from '@/services/projectService'

import { useLiveQuery } from './useLiveQuery'

export function useProjects() {
  const projects = useLiveQuery(() => projectService.listProjects(), [])

  return {
    projects,
    createProject: (input: NewProjectInput) => projectService.createProject(input),
    updateProject: (id: string, patch: ProjectPatch) => projectService.updateProject(id, patch),
    deleteProject: (id: string) => projectService.deleteProject(id),
  }
}

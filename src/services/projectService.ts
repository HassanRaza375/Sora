import { db } from '@/services/db'
import type { Project } from '@/models'
import { createId } from '@/utils/id'

export interface NewProjectInput {
  name: string
  description?: string
  color: string
  icon?: string
}

export type ProjectPatch = Partial<Pick<Project, 'name' | 'description' | 'color' | 'icon' | 'archived'>>

export function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('createdAt').toArray()
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const project: Project = {
    id: createId(),
    name: input.name,
    description: input.description,
    color: input.color,
    icon: input.icon,
    archived: false,
    createdAt: new Date().toISOString(),
  }
  await db.projects.add(project)
  return project
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<void> {
  await db.projects.update(id, patch)
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, async () => {
    await db.tasks.where('projectId').equals(id).modify({ projectId: undefined })
    await db.projects.delete(id)
  })
}

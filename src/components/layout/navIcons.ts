import { BarChart3, Calendar, FolderKanban, Inbox, ListChecks, MoreHorizontal, Settings, Sun } from '@lucide/vue'
import type { Component } from 'vue'

// Keeps router meta decoupled from the icon library — routes.ts only
// stores a string key, resolved to a component here.
export const navIcons: Record<string, Component> = {
  sun: Sun,
  inbox: Inbox,
  'list-checks': ListChecks,
  'folder-kanban': FolderKanban,
  calendar: Calendar,
  'bar-chart-3': BarChart3,
  settings: Settings,
  'more-horizontal': MoreHorizontal,
}

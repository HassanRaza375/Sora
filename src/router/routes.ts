import type { RouteRecordRaw } from 'vue-router'

// Routes without a real view yet point at the shared PlaceholderView — they
// land module-by-module per road_map.md. `showInSidebar` / `showInBottomNav`
// let the nav chrome render itself from this table instead of a
// hand-maintained duplicate list.
const PlaceholderView = () => import('@/views/PlaceholderView.vue')
const TodayView = () => import('@/views/TodayView.vue')
const InboxView = () => import('@/views/InboxView.vue')
const TasksView = () => import('@/views/TasksView.vue')
const ProjectsView = () => import('@/views/ProjectsView.vue')
const ProjectDetailView = () => import('@/views/ProjectDetailView.vue')
const CalendarView = () => import('@/views/CalendarView.vue')
const InsightsView = () => import('@/views/InsightsView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/today',
  },
  {
    path: '/today',
    name: 'today',
    component: TodayView,
    meta: { title: 'Today', icon: 'sun', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/inbox',
    name: 'inbox',
    component: InboxView,
    meta: { title: 'Inbox', icon: 'inbox', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: TasksView,
    meta: { title: 'Tasks', icon: 'list-checks', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsView,
    meta: { title: 'Projects', icon: 'folder-kanban', showInSidebar: true, showInBottomNav: false },
  },
  {
    path: '/projects/:id',
    name: 'project-detail',
    component: ProjectDetailView,
    meta: { title: 'Project', icon: 'folder-kanban', showInSidebar: false, showInBottomNav: false },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: CalendarView,
    meta: { title: 'Calendar', icon: 'calendar', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/insights',
    name: 'insights',
    component: InsightsView,
    meta: { title: 'Insights', icon: 'bar-chart-3', showInSidebar: true, showInBottomNav: false },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    // Sections (Appearance/Planning/Notifications/Data) are `?tab=`-synced
    // tabs within this one view, not nested routes — see SettingsView.vue.
    // Planning absorbed the standalone `/planning` route from Phase 8 (a
    // deliberately deferred decision, resolved now that Settings exists):
    // its content lives in src/components/settings/PlanningSettings.vue.
    meta: { title: 'Settings', icon: 'settings', showInSidebar: true, showInBottomNav: false },
  },
  {
    path: '/more',
    name: 'more',
    component: PlaceholderView,
    meta: { title: 'More', icon: 'more-horizontal', showInSidebar: false, showInBottomNav: true },
  },
]

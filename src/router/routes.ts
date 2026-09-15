import type { RouteRecordRaw } from 'vue-router'

// Every route currently points at the shared PlaceholderView — real views
// land module-by-module per the roadmap (M2 Tasks/Inbox, M3 Projects, ...).
// `showInSidebar` / `showInBottomNav` let the nav chrome render itself from
// this table instead of a hand-maintained duplicate list.
const PlaceholderView = () => import('@/views/PlaceholderView.vue')

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/today',
  },
  {
    path: '/today',
    name: 'today',
    component: PlaceholderView,
    meta: { title: 'Today', icon: 'sun', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/inbox',
    name: 'inbox',
    component: PlaceholderView,
    meta: { title: 'Inbox', icon: 'inbox', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: PlaceholderView,
    meta: { title: 'Tasks', icon: 'list-checks', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/projects',
    name: 'projects',
    component: PlaceholderView,
    meta: { title: 'Projects', icon: 'folder-kanban', showInSidebar: true, showInBottomNav: false },
  },
  {
    path: '/projects/:id',
    name: 'project-detail',
    component: PlaceholderView,
    meta: { title: 'Project', icon: 'folder-kanban', showInSidebar: false, showInBottomNav: false },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: PlaceholderView,
    meta: { title: 'Calendar', icon: 'calendar', showInSidebar: true, showInBottomNav: true },
  },
  {
    path: '/insights',
    name: 'insights',
    component: PlaceholderView,
    meta: { title: 'Insights', icon: 'bar-chart-3', showInSidebar: true, showInBottomNav: false },
  },
  {
    path: '/settings',
    name: 'settings',
    component: PlaceholderView,
    meta: { title: 'Settings', icon: 'settings', showInSidebar: true, showInBottomNav: false },
  },
  {
    path: '/more',
    name: 'more',
    component: PlaceholderView,
    meta: { title: 'More', icon: 'more-horizontal', showInSidebar: false, showInBottomNav: true },
  },
]

# Sora — Implementation Roadmap

Current state: foundation only. Build tooling, Tailwind v4 tokens, routing skeleton, and the Dexie schema are wired and verified. Every route renders `PlaceholderView.vue`. No feature UI, no shadcn-vue components generated, no stores/composables/services beyond scaffolding.

This roadmap sequences work so each phase only depends on what's already built — no phase requires jumping ahead.

---

## Phase 0 — Foundation (done)
- Vite + Vue 3 + TS build pipeline
- Dexie schema (`db.ts`, 10 tables) and models
- Tailwind v4 design tokens (type scale, radius scale, priority colors, light/dark theme)
- Routing skeleton with `meta` (title, icon, showInSidebar, showInBottomNav)
- shadcn-vue config (`components.json`, `cn()` util) — components not generated yet

---

## Phase 1 — Core plumbing (done)
Nothing else can be built cleanly until this exists.
- Hand-wrote the first batch of shadcn-vue primitives against the `new-york` / `neutral` config: `button`, `label`, `input`, `badge`, `checkbox`, `tabs`, `select`, `dialog`, `sheet` (the CLI still can't run on Node 20 — see CLAUDE.md)
- Built the shared `useLiveQuery` composable wrapping Dexie `liveQuery`
- Built `taskService` and `projectService` (Dexie access + business logic, framework-free)
- Built `useTasks` and `useProjects` composables on top of those services
- Built `Sidebar` (desktop, collapsible) and `BottomNav` (mobile) driven by `routes.ts` meta, wired together in a new `AppShell` and mounted from `App.vue`

Note: composables call services directly (no Pinia store in between) — `useLiveQuery` already gives every subscriber live, cross-tab-reactive data, so a Pinia domain store would just duplicate that. `stores/` stays reserved for transient UI state (drawer open/close, command palette, settings) whenever a later phase needs it.

## Phase 2 — Task creation drawer
Almost every other view needs a way to create/edit tasks first.
- Global drawer state (not a route), mirrored into `?task=` query param
- Task section: title, project, priority, status, Today toggle
- Schedule section: due date, estimated duration, recurrence (recurrence UI can stub until Phase 7)
- Details section: notes, subtasks
- Inline auto-save behavior

## Phase 3 — Inbox
- Inbox view: tasks with no `projectId` and no `dueDate`
- Auto-removal from Inbox when either is assigned
- Inbox count badge in nav

## Phase 4 — Tasks view
- List view (default) with filters: project, status, priority, due date
- Kanban view (To Do / In Progress / Done)
- Completed tasks leave active views

## Phase 5 — Projects
- Project CRUD (name, description, color/icon)
- Project detail view showing its tasks
- Derived progress calculation

## Phase 6 — Today (home)
- Date/greeting, daily workload summary
- Today's tasks, overdue warning, upcoming deadlines
- "Plan My Day" entry point (button only — planner logic comes in Phase 8)

## Phase 7 — Calendar
- Month and Agenda views, deadline-focused (no time blocking)

## Phase 8 — Planning system
- Availability settings: working hours, breaks, unavailable periods (`availabilitySchedules`, `unavailablePeriods`)
- Plan My Day algorithm: priority → deadline → estimated duration → available capacity
- Recommended plan output, overflow task handling, manual adjustment
- Never silently reschedules — writes `DailyPlan` only on explicit user action

## Phase 9 — Recurring tasks
- Recurrence rule builder (daily, weekly, weekdays, specific weekdays, intervals, monthly, yearly)
- `RecurringRule` → generates `Task` + `RecurringInstance` rows on a rolling window
- History preserved when a rule is paused/ended

## Phase 10 — Notifications & reminders
- `useReminderScheduler` composable: foreground in-page timer firing browser `Notification`s (no service-worker push)
- Reminder offsets: due time, 5/15/30 min before, 1 hr before, 1 day before, custom
- Actions: open task, complete, snooze

## Phase 11 — Insights
- Tasks completed, completion rate, workload, project progress, planning accuracy, recurring completion
- Reads from `completionHistory` (append-only snapshots), not live task joins

## Phase 12 — Settings
- Appearance (system/light/dark)
- Planning (availability, breaks, unavailable periods — UI for what Phase 8 built)
- Notifications toggles
- Data: export, import, backup, clear data

## Phase 13 — Search & command palette
- Visible search
- Command palette: search, navigation, main actions

## Phase 14 — PWA & polish pass
- Service worker verification (Workbox `generateSW`), offline behavior testing
- Real manifest icons (replace placeholder PNGs)
- Self-hosted fonts (currently no font files present)
- Motion pass: drawer transitions, hover states, page transitions, completion feedback
- Accessibility pass: keyboard nav, focus states, screen-reader labels, contrast, reduced motion

---

## Future (post-MVP, per spec)
- Weekly planning
- Habits
- Task dependencies
- Advanced command palette actions
- Deeper analytics
- Cloud sync

---

## Notes on ordering
- Phases 1–2 are the real bottleneck — task CRUD and the creation drawer gate everything downstream.
- Phase 8 (planner) intentionally comes after Today/Calendar exist, since it needs somewhere to surface its output.
- Recurrence (9) and notifications (10) are independent of each other and can be reordered or parallelized if useful.
- Settings (12) is placed late because most of its sections are just UI over state introduced earlier (availability in 8, notifications in 10, appearance/data are standalone).
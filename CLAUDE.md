# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 1 (core plumbing) done, per `road_map.md`.** Build tooling, styling, the Dexie schema, a first batch of shadcn-vue primitives, the `taskService`/`projectService` + `useTasks`/`useProjects` composables, and the Sidebar/BottomNav nav chrome are in place and verified (`npm run build` passes clean). Every route still renders the shared `PlaceholderView.vue` — no feature module (Tasks, Inbox, Projects, etc.) is built yet. `road_map.md` is the authoritative phase-by-phase sequencing; check it before starting new work, and check the filesystem before assuming a view/component/composable exists.

`Sora_Product_Specification.md` at the repo root is the product spec — read it before implementing any feature module (Today, Inbox, Tasks, Projects, Calendar, Insights, Settings). It defines required/optional task fields, the planner algorithm inputs, recurrence types, reminder offsets, and the full design system (colors, type scale, spacing, radius).

## Commands

```bash
npm run dev       # start the Vite dev server
npm run build     # vue-tsc -b (type-check, project-wide) then vite build
npm run preview   # preview the production build locally
```

There is no test runner, linter, or formatter configured yet. Type errors surface only via `npm run build` (or `npx vue-tsc -b` directly) — there's no separate `typecheck` script.

## Architecture

One-directional data flow; do not skip layers:

```
Components → Composables → Services → Dexie (IndexedDB)
```

Composables call services directly — there is **no Pinia store in this data path**. `useLiveQuery` (wrapping Dexie's `liveQuery`) already gives every subscriber live, cross-tab-reactive data, so inserting a Pinia store between composables and services would just duplicate that reactivity for no benefit. `src/stores/` is reserved for transient, non-Dexie UI state (drawer open/close, command palette, settings) — populate it only when a phase actually needs shared UI state, not preemptively.

- **`src/components/**`** — presentational only. Domain components (`task/`, `project/`, `calendar/`, `today/`, `insights/`, `inbox/`, `settings/`) must not import services or `db` directly — they read from composables. `src/components/ui/` holds hand-written shadcn-vue primitives (see below); `src/components/layout/` holds `AppShell`/`Sidebar`/`BottomNav`.
- **`src/composables/**`** — feature-level logic (e.g. `useTasks`, `useProjects`, later `usePlanner`) built directly on services, using `useLiveQuery` for reactive reads and plain async calls for mutations.
- **`src/composables/useLiveQuery.ts`** — bridges a Dexie `liveQuery` to a Vue `shallowRef`, unsubscribing via `onScopeDispose`. Every reactive read from Dexie should go through this rather than one-off `.toArray()` calls.
- **`src/services/**`** — Dexie table access + business logic that isn't view-specific (e.g. `taskService.ts`, `projectService.ts`). Services must stay framework-free (no Vue/Pinia imports) so the planner and recurrence algorithms can be unit tested in isolation. `db.ts` is the only place the `SoraDB` Dexie class is defined. Services return plain data and expose both query functions (for `useLiveQuery`) and mutation functions (create/update/delete) — they don't generate IDs or timestamps inconsistently, always via `src/utils/id.ts`'s `createId()` and `new Date().toISOString()`.
- **`src/models/**`** — plain TypeScript interfaces/types, re-exported from `src/models/index.ts`. These are Dexie's source of truth for table typing — update a model here before touching `db.ts`'s `.stores()` call.

### Data layer specifics

`src/services/db.ts` defines a single `SoraDB` (Dexie v1) with 10 tables: `tasks`, `subtasks`, `projects`, `recurringRules`, `recurringInstances`, `dailyPlans`, `availabilitySchedules`, `unavailablePeriods`, `completionHistory`, `reminders`. Notable non-UUID primary keys: `dailyPlans` is keyed by `date` (YYYY-MM-DD), `availabilitySchedules` by `weekday` (0–6). Schema changes must go through a new `this.version(n)` block, never editing version 1 in place.

`localStorage` is reserved for UI-only preferences (theme, sidebar collapsed, last view, notification toggle, default reminder offset) — everything else (all task/project/planning data) belongs in Dexie. This split is a deliberate product constraint, not an implementation detail — see the spec's Data Architecture section.

`completionHistory` is an append-only log that snapshots task fields (`title`, `priority`, `estimatedDuration`, `projectId`) at completion time rather than joining live task data, so Insights stay accurate after a task is edited or deleted later.

### Routing

`src/router/routes.ts` is the single source of truth for navigation — each route's `meta` (`title`, `icon`, `showInSidebar`, `showInBottomNav`, typed via `route-meta.d.ts`) drives `Sidebar`/`BottomNav` (via `src/components/layout/navIcons.ts`, which maps the `icon` string to a `@lucide/vue` component) instead of a separate hand-maintained nav list — add a route, and nav chrome updates itself. All route components are lazy-loaded. `/settings` sections are tabs within one view, not nested routes. The task creation/edit drawer is planned as global UI state (not a route) mirrored into a `?task=` query param for deep-linking and back-button behavior — it does not exist yet (Phase 2).

`Sidebar` is CSS-responsive (`hidden md:flex`) and self-contains its own collapse state (a local `ref`, not persisted yet); `BottomNav` is `md:hidden`. Both are rendered unconditionally from `AppShell.vue` — there's no JS-level `isMobile` branching, so don't add a `useBreakpoint`-style composable unless a future phase (e.g. the drawer choosing side="right" vs side="bottom") actually needs mobile detection in script, not just CSS.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first config, no `tailwind.config.ts`). All design tokens live in `src/styles/tailwind.css`: light/dark theme via `:root` / `.dark` CSS variables, a custom type scale (`text-page-title`, `text-section`, `text-body`, `text-secondary`, `text-caption` utilities mapping to 32/20/14/13/12px per the spec), a mixed radius scale (`--radius-sm/md/lg/xl`), and `--color-priority-{urgent,high,medium,low}` tokens for priority badges. Extend tokens here, not with ad-hoc arbitrary values in components.

### shadcn-vue

`components.json` and `src/lib/utils.ts` (`cn()`) are configured. `src/components/ui/` currently has hand-written `button`, `label`, `input`, `badge`, `checkbox`, `tabs`, `select`, `dialog`, `sheet` — each a folder with one `.vue` file per part plus an `index.ts` barrel (and a `cva()` variants export for `button`/`badge`/`sheet`), following the real shadcn-vue "new-york" source structure so a future CLI-generated component would drop in compatibly.

The `shadcn-vue` CLI requires Node ≥22; this environment's Node is older (20.x when Phase 0/1 were built), so `npx shadcn-vue@latest init` / `add` fail with an `undici`/`webidl` crash — check `node -v` before assuming the CLI works. If it still fails when adding a new component, hand-write it against the existing files as templates (same reka-ui primitive names, same Tailwind token classes, same prop-delegation pattern: a `computed` that strips `class` out of `props` before `v-bind`-ing the rest, because declared props don't fall through automatically in Vue).

### PWA

`vite-plugin-pwa` is configured in `vite.config.ts` with `generateSW` (Workbox-generated service worker) — there is no custom service worker file. Manifest icons live in `public/icons/` and are currently **placeholder solid-color PNGs** generated by a one-off script (not committed), not final branded assets. Fonts are self-hosted-ready (`public/fonts/`, with a commented `@font-face` block in `tailwind.css`) rather than pulled from a CDN, so first load stays fully offline-capable — no font files are actually present yet.

Reminders/notifications are foreground-only by design: there's no backend to push from, so the planned `useReminderScheduler` composable will fire browser `Notification`s via an in-page timer while the app is open/backgrounded, not via service-worker push. Don't add a push backend or `notificationclick` SW handler without an explicit decision to change this constraint.

## Product constraints worth knowing before implementing a feature

- The planner ("Plan My Day") **never silently reschedules** — it only writes a recommended `DailyPlan` on explicit user action and surfaces overflow tasks rather than auto-moving them.
- Recurring tasks: a `RecurringRule` generates concrete `Task` + `RecurringInstance` rows ahead of time (rolling window); instances and completion history are never deleted when a rule is paused/ended, so history is preserved.
- Inbox membership (not explicit in the spec) is: a task with no `projectId` and no `dueDate`. Assigning either moves it out of Inbox automatically.

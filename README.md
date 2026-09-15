# Sora — Personal Time & Task OS

A calm, premium, offline-first personal productivity PWA. See [Sora_Product_Specification.md](./Sora_Product_Specification.md) for the product spec and the plan under `.claude/plans` (or ask Claude) for the technical architecture.

## Stack

Vue 3 + TypeScript + Vite, Tailwind CSS + shadcn-vue, Pinia, Vue Router, Dexie.js (IndexedDB), vite-plugin-pwa.

## Scripts

```bash
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
```

## Status

Foundation only — build tooling, styling system, routing skeleton, and the Dexie schema are wired up. No feature UI has been built yet; see the roadmap milestones for what's next.

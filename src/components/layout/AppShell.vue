<script setup lang="ts">
import TaskDrawer from '@/components/task/TaskDrawer.vue'

import BottomNav from './BottomNav.vue'
import CommandPalette from './CommandPalette.vue'
import Sidebar from './Sidebar.vue'
</script>

<template>
  <div class="flex h-svh w-full">
    <Sidebar />
    <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <BottomNav />
    <TaskDrawer />
    <CommandPalette />
  </div>
</template>

<style scoped>
/* Subtle, not "distracting" per the spec's own wording — a short
   cross-fade smooths the hard cut between routes without adding any
   slide/scale motion. mode="out-in" (rather than a simultaneous
   cross-fade) avoids the old and new page briefly overlapping in
   normal document flow, which would otherwise need position:absolute
   during the transition to avoid a layout jump. Respects
   prefers-reduced-motion automatically via the existing global rule in
   tailwind.css (`transition-duration: 0.01ms !important` under that
   media query) — no separate handling needed here. */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 120ms ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>

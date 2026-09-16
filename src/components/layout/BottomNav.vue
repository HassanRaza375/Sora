<script setup lang="ts">
import { Plus, Search } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useCommandPalette } from '@/composables/useCommandPalette'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { useTasks } from '@/composables/useTasks'
import { cn } from '@/lib/utils'
import { routes } from '@/router/routes'

import { navIcons } from './navIcons'

const route = useRoute()
const { openTaskDrawer } = useTaskDrawer()
const { open: openCommandPalette } = useCommandPalette()
const { inboxCount } = useTasks()

const items = computed(() => routes.filter((r) => r.meta?.showInBottomNav))
</script>

<template>
  <nav
    class="border-border bg-card fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t md:hidden"
    style="padding-bottom: env(safe-area-inset-bottom, 0px)"
  >
    <RouterLink
      v-for="item in items"
      :key="String(item.name)"
      :to="item.path"
      :class="
        cn(
          'text-caption text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1',
          route.name === item.name && 'text-primary',
        )
      "
    >
      <span class="relative">
        <component :is="navIcons[item.meta!.icon]" class="h-5 w-5" />
        <span
          v-if="item.name === 'inbox' && inboxCount > 0"
          class="bg-primary text-primary-foreground absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[10px] leading-none"
        >
          {{ inboxCount > 9 ? '9+' : inboxCount }}
        </span>
      </span>
      <span>{{ item.meta!.title }}</span>
    </RouterLink>

    <!-- Both floating buttons are anchored to `bottom-full` (the nav's own
         top edge), not `top-0` + a half-height negative translate — the
         latter centers the button ON the nav's border, so half its height
         always intrudes into the icon row underneath (previously landing
         squarely on the middle "Tasks" item, obscuring its icon). Sitting
         fully above the bar via `bottom-full` + a margin means neither
         button can ever overlap a nav item's icon, at any nav item count. -->
    <button
      type="button"
      aria-label="New Task"
      class="bg-primary text-primary-foreground absolute left-1/2 bottom-full mb-3 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full shadow-lg"
      @click="openTaskDrawer()"
    >
      <Plus class="h-5 w-5" />
    </button>

    <!-- No keyboard on mobile, so this floating trigger is the only way
         to reach the command palette there — added as a second, smaller
         circle next to New Task rather than a 6th flex-1 nav item, which
         would crowd the existing 5-item row. Positioned a fixed 5rem left
         of center (not just "next to" New Task via a small offset) so its
         40px width clears New Task's 48px width with a real gap between
         them, rather than the two circles overlapping. -->
    <button
      type="button"
      aria-label="Search"
      class="border-border bg-card text-foreground absolute left-[calc(50%-5rem)] bottom-full mb-2 flex h-10 w-10 items-center justify-center rounded-full border shadow-md"
      @click="openCommandPalette()"
    >
      <Search class="h-4 w-4" />
    </button>
  </nav>
</template>

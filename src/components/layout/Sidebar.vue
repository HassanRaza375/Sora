<script setup lang="ts">
import { ChevronsLeft, ChevronsRight, Plus, Search } from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import logoLockupDark from '@/assets/logo-lockup-for-dark-theme.png'
import logoLockupLight from '@/assets/logo-lockup-for-light-theme.png'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCommandPalette } from '@/composables/useCommandPalette'
import { useTaskDrawer } from '@/composables/useTaskDrawer'
import { useTasks } from '@/composables/useTasks'
import { cn } from '@/lib/utils'
import { routes } from '@/router/routes'

import { navIcons } from './navIcons'

const route = useRoute()
const collapsed = ref(false)
const { openTaskDrawer } = useTaskDrawer()
const { open: openCommandPalette } = useCommandPalette()
const { inboxCount } = useTasks()

const items = computed(() => routes.filter((r) => r.meta?.showInSidebar))
</script>

<template>
  <aside
    class="border-border bg-card hidden h-svh shrink-0 flex-col border-r transition-[width] duration-200 md:flex"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div class="flex h-14 shrink-0 items-center px-4">
      <!-- Two color variants, swapped by the same `.dark` class useTheme()
           already toggles on <html> — CSS-only, no extra reactive state
           needed. The lockup's wordmark/second-shape pixels were recolored
           per theme at asset-prep time (see src/assets/); the indigo shape
           itself was left untouched in both since it already reads fine
           against both surfaces (see CLAUDE.md's contrast note). -->
      <img
        v-if="!collapsed"
        :src="logoLockupLight"
        alt="Sora"
        class="h-6 w-auto dark:hidden"
      />
      <img
        v-if="!collapsed"
        :src="logoLockupDark"
        alt="Sora"
        class="hidden h-6 w-auto dark:block"
      />
      <img
        v-else
        src="/icons/icon-192.png"
        alt="Sora"
        class="h-7 w-7 rounded-md"
      />
    </div>

    <div class="flex flex-col gap-2 px-2 pb-2">
      <Button :class="cn('w-full gap-2', collapsed && 'px-0')" @click="openTaskDrawer()">
        <Plus class="h-4 w-4 shrink-0" />
        <span v-if="!collapsed">New Task</span>
      </Button>
      <Button
        variant="outline"
        :class="cn('w-full gap-2', collapsed && 'px-0')"
        :title="collapsed ? 'Search (Ctrl/Cmd+K)' : undefined"
        @click="openCommandPalette()"
      >
        <Search class="h-4 w-4 shrink-0" />
        <span v-if="!collapsed" class="flex-1 text-left">Search</span>
        <kbd v-if="!collapsed" class="border-border bg-secondary text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>
    </div>

    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
      <RouterLink
        v-for="item in items"
        :key="String(item.name)"
        :to="item.path"
        :title="collapsed ? item.meta!.title : undefined"
        :class="
          cn(
            'text-body text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
            route.name === item.name && 'bg-accent text-accent-foreground',
            collapsed && 'justify-center',
          )
        "
      >
        <span class="relative shrink-0">
          <component :is="navIcons[item.meta!.icon]" class="h-4 w-4" />
          <span
            v-if="item.name === 'inbox' && inboxCount > 0 && collapsed"
            class="bg-primary absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full"
          />
        </span>
        <span v-if="!collapsed" class="flex-1 truncate">{{ item.meta!.title }}</span>
        <Badge v-if="item.name === 'inbox' && inboxCount > 0 && !collapsed" variant="secondary">
          {{ inboxCount }}
        </Badge>
      </RouterLink>
    </nav>

    <div class="p-2">
      <button
        type="button"
        class="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs transition-colors"
        @click="collapsed = !collapsed"
      >
        <component :is="collapsed ? ChevronsRight : ChevronsLeft" class="h-4 w-4" />
        <span v-if="!collapsed">Collapse</span>
      </button>
    </div>
  </aside>
</template>

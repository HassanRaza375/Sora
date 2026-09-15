<script setup lang="ts">
import { ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { cn } from '@/lib/utils'
import { routes } from '@/router/routes'

import { navIcons } from './navIcons'

const route = useRoute()
const collapsed = ref(false)

const items = computed(() => routes.filter((r) => r.meta?.showInSidebar))
</script>

<template>
  <aside
    class="border-border bg-card hidden h-svh shrink-0 flex-col border-r transition-[width] duration-200 md:flex"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div class="flex h-14 shrink-0 items-center px-4">
      <span v-if="!collapsed" class="text-section font-semibold">Sora</span>
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
        <component :is="navIcons[item.meta!.icon]" class="h-4 w-4 shrink-0" />
        <span v-if="!collapsed">{{ item.meta!.title }}</span>
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

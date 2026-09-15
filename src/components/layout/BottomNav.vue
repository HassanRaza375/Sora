<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { cn } from '@/lib/utils'
import { routes } from '@/router/routes'

import { navIcons } from './navIcons'

const route = useRoute()

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
      <component :is="navIcons[item.meta!.icon]" class="h-5 w-5" />
      <span>{{ item.meta!.title }}</span>
    </RouterLink>
  </nav>
</template>

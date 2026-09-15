<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { TabsList, type TabsListProps } from 'reka-ui'

import { cn } from '@/lib/utils'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <TabsList
    :class="cn('bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-md p-1', props.class)"
  >
    <slot />
  </TabsList>
</template>

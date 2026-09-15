<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { SelectScrollDownButton, type SelectScrollDownButtonProps } from 'reka-ui'

import { cn } from '@/lib/utils'

const props = defineProps<SelectScrollDownButtonProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <SelectScrollDownButton :class="cn('flex cursor-default items-center justify-center py-1', props.class)">
    <ChevronDown class="h-4 w-4" />
  </SelectScrollDownButton>
</template>

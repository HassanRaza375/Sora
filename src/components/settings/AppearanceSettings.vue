<script setup lang="ts">
import { useTheme, type ThemePreference } from '@/composables/useTheme'
import { cn } from '@/lib/utils'

const { theme, setTheme } = useTheme()

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
</script>

<template>
  <section class="flex flex-col gap-3">
    <div>
      <h2 class="text-meta text-muted-foreground font-medium">Appearance</h2>
      <p class="text-caption text-muted-foreground">
        "System" follows your OS's light/dark setting automatically and updates live if you change it.
      </p>
    </div>

    <div class="flex gap-2">
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        type="button"
        :aria-pressed="theme === option.value"
        :class="
          cn(
            'border-input rounded-md border px-4 py-2 text-sm transition-colors',
            theme === option.value ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-accent',
          )
        "
        @click="setTheme(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </section>
</template>

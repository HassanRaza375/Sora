<script setup lang="ts">
// Temporary stand-in so routing/navigation is wired and testable before each
// module's real view is built out (see roadmap milestones M2+).
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="flex min-h-svh flex-col items-center justify-center gap-2 p-8 text-center">
    <h1 class="text-page-title">{{ route.meta.title }}</h1>
    <p class="text-secondary text-muted-foreground">This view hasn't been built yet.</p>
  </div>
</template>

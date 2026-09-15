<script setup lang="ts">
import BottomNav from './BottomNav.vue'
import Sidebar from './Sidebar.vue'
</script>

<template>
  <div class="flex h-svh w-full">
    <Sidebar />
    <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
      <RouterView />
    </main>
    <BottomNav />
  </div>
</template>

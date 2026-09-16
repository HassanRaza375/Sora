<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppearanceSettings from '@/components/settings/AppearanceSettings.vue'
import DataSettings from '@/components/settings/DataSettings.vue'
import NotificationsSettings from '@/components/settings/NotificationsSettings.vue'
import PlanningSettings from '@/components/settings/PlanningSettings.vue'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const route = useRoute()
const router = useRouter()

// Sections are tabs within this one view, not nested routes (see
// CLAUDE.md's Routing note) — `?tab=` follows the same URL-sync
// convention as Tasks' List/Kanban and Insights' range selector
// (router.replace, default omitted from the URL).
const TABS = ['appearance', 'planning', 'notifications', 'data'] as const
type SettingsTab = (typeof TABS)[number]

function isSettingsTab(value: unknown): value is SettingsTab {
  return typeof value === 'string' && (TABS as readonly string[]).includes(value)
}

const activeTab = computed<SettingsTab>(() => {
  const raw = route.query.tab
  return isSettingsTab(raw) ? raw : 'appearance'
})

function onTabChange(value: unknown) {
  if (!isSettingsTab(value)) return
  void router.replace({ query: { ...route.query, tab: value === 'appearance' ? undefined : value } })
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-8 p-6 md:p-8">
    <header>
      <h1 class="text-page-title">Settings</h1>
    </header>

    <Tabs :model-value="activeTab" @update:model-value="onTabChange">
      <TabsList>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="planning">Planning</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>
    </Tabs>

    <AppearanceSettings v-if="activeTab === 'appearance'" />
    <PlanningSettings v-else-if="activeTab === 'planning'" />
    <NotificationsSettings v-else-if="activeTab === 'notifications'" />
    <DataSettings v-else />
  </div>
</template>

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import * as taskService from '@/services/taskService'

const QUERY_KEY = 'task'

/**
 * Owns the task drawer's open/closed state as a thin derivation of the
 * `?task=` query param, rather than a separate ref that has to be kept in
 * sync with it. That makes the browser back button "just work" (popping
 * the param closes the drawer) and lets any link deep-link into editing a
 * task by navigating to `?task=<id>`.
 */
export function useTaskDrawer() {
  const route = useRoute()
  const router = useRouter()

  const taskId = computed<string | undefined>(() => {
    const raw = route.query[QUERY_KEY]
    return typeof raw === 'string' && raw.length > 0 ? raw : undefined
  })

  const isOpen = computed(() => taskId.value !== undefined)

  async function openTaskDrawer(id?: string) {
    const targetId = id ?? (await taskService.createDraftTask()).id
    await router.push({ query: { ...route.query, [QUERY_KEY]: targetId } })
  }

  function closeTaskDrawer() {
    const { [QUERY_KEY]: _discarded, ...rest } = route.query
    void router.push({ query: rest })
  }

  return { isOpen, taskId, openTaskDrawer, closeTaskDrawer }
}

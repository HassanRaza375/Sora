import { liveQuery } from 'dexie'
import { onScopeDispose, shallowRef, type Ref } from 'vue'

/**
 * Bridges a Dexie liveQuery to a Vue ref. Every store/composable that reads
 * from Dexie should go through this instead of one-off `.toArray()` calls,
 * so writes from any tab/component are reflected everywhere instantly.
 */
export function useLiveQuery<T>(querier: () => T | Promise<T>, initialValue: T): Ref<T> {
  const state = shallowRef(initialValue) as Ref<T>

  const subscription = liveQuery(querier).subscribe({
    next: (value) => {
      state.value = value
    },
    error: (error) => {
      console.error('useLiveQuery error:', error)
    },
  })

  onScopeDispose(() => {
    subscription.unsubscribe()
  })

  return state
}

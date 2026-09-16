import { liveQuery } from 'dexie'
import { onScopeDispose, shallowRef, watch, type Ref, type WatchSource } from 'vue'

/**
 * Bridges a Dexie liveQuery to a Vue ref. Every store/composable that reads
 * from Dexie should go through this instead of one-off `.toArray()` calls,
 * so writes from any tab/component are reflected everywhere instantly.
 *
 * Dexie re-runs `querier` on its own whenever a table it touched changes,
 * but it has no idea when an unrelated Vue ref the querier closes over
 * (e.g. a task id) changes — that wouldn't cause a re-run on its own. Pass
 * `resubscribeOn` (typically the id) for a query keyed by a reactive value,
 * so the subscription is torn down and rebuilt against the new key.
 */
export function useLiveQuery<T>(querier: () => T | Promise<T>, initialValue: T, resubscribeOn?: WatchSource): Ref<T> {
  const state = shallowRef(initialValue) as Ref<T>
  let subscription: { unsubscribe: () => void } | undefined

  function subscribe() {
    subscription?.unsubscribe()
    subscription = liveQuery(querier).subscribe({
      next: (value) => {
        state.value = value
      },
      error: (error) => {
        console.error('useLiveQuery error:', error)
      },
    })
  }

  if (resubscribeOn) {
    watch(resubscribeOn, subscribe, { immediate: true })
  } else {
    subscribe()
  }

  onScopeDispose(() => {
    subscription?.unsubscribe()
  })

  return state
}

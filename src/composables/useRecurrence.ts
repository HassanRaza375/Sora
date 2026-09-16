import { toValue, type MaybeRefOrGetter } from 'vue'

import * as recurrenceService from '@/services/recurrenceService'

import { useLiveQuery } from './useLiveQuery'

/** A single rule, reactively keyed by a (possibly reactive/undefined) rule id — e.g. TaskDrawer.vue tracking the currently-open task's `recurringRuleId`. */
export function useRecurringRule(ruleId: MaybeRefOrGetter<string | undefined>) {
  const rule = useLiveQuery(
    () => {
      const id = toValue(ruleId)
      return id ? recurrenceService.getRule(id) : Promise.resolve(undefined)
    },
    undefined,
    () => toValue(ruleId),
  )

  return { rule }
}

export function useRecurrence() {
  const rules = useLiveQuery(() => recurrenceService.listRules(), [])

  return {
    rules,
    createRuleForTask: recurrenceService.createRuleForTask,
    updateRulePattern: recurrenceService.updateRulePattern,
    setRuleActive: recurrenceService.setRuleActive,
  }
}

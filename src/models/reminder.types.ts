export type ReminderOffset = 'due' | '5m' | '15m' | '30m' | '1h' | '1d' | 'custom'

export type ReminderStatus = 'pending' | 'fired' | 'dismissed' | 'snoozed'

export interface Reminder {
  id: string
  taskId: string
  triggerAt: string
  offsetType: ReminderOffset
  status: ReminderStatus
  snoozedUntil?: string
}

export interface PlanItem {
  taskId: string
  order: number
}

export interface DailyPlan {
  /** YYYY-MM-DD, primary key. */
  date: string
  items: PlanItem[]
  overflowTaskIds: string[]
  capacityMinutes: number
  plannedMinutes: number
  generatedAt: string
}

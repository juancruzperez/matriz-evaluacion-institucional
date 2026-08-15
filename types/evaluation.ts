export type Urgency = "alto" | "medio" | "bajo"

export type IndicatorField = "observation" | "urgency" | "strengths" | "number" | "text" | "multiSelect" | "month"

export type Indicator = {
  id: string
  title: string
  description: string
  hasUrgency?: boolean
  hasStrengths?: boolean
  fields?: Array<{
    id: string
    label: string
    type: "number" | "text" | "multiSelect" | "month"
    options?: string[]
  }>
}

export type Dimension = {
  id: string
  number: string
  title: string
  objective: string
  indicators: Indicator[]
}

export type IndicatorResponse = {
  observation: string
  urgency?: Urgency
  strengths?: string
  fields?: Record<string, string | string[]>
}

export type EvaluationStatus = "draft" | "closed"

export type Evaluation = {
  id: string
  version: number
  status: EvaluationStatus
  closedAt?: string
  institutionId: string
  level: string | null
  date: string
  managementTeamPresent: boolean | null
  managementTeamContact: string
  responses: Record<string, IndicatorResponse>
  updatedAt: string
}

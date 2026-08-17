export type Urgency = "alto" | "medio" | "bajo"

export type EvaluationStatus = "draft" | "closed"

export type IndicatorResponse = {
  observation: string
  urgency?: Urgency
  strengths?: string
  fields?: Record<string, string | string[]>
}

export type Evaluation = {
  id: string
  version: number
  status: EvaluationStatus
  closedAt?: string

  institutionId: string
  institutionLevelId: string | null

  date: string

  managementTeamPresent: boolean | null
  managementTeamContact: string

  responses: Record<string, IndicatorResponse>

  updatedAt: string
}
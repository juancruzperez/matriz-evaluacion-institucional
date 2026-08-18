export type Urgency = "alto" | "medio" | "bajo"

export type EvaluationResponse = {
  id: string
  evaluationId: string
  indicatorId: string

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
  institutionLevelId: string | null

  date: string

  managementTeamPresent: boolean | null
  managementTeamContact: string

  responses: EvaluationResponse[]

  updatedAt: string
}
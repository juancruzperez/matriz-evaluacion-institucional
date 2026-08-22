import { sql } from "@/lib/db"
import type { Evaluation, EvaluationResponse } from "@/types/evaluation"

type EvaluationRow = {
  id: string
  version: number
  status: Evaluation["status"]
  institution_id: string
  institution_level_id: string | null
  date: string
  management_team_present: boolean | null
  management_team_contact: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  closed_at: string | null
}

type EvaluationResponseRow = {
  id: string
  evaluation_id: string
  indicator_id: string
  observation: string
  urgency: EvaluationResponse["urgency"] | null
  strengths: string | null
  fields: Record<string, string | string[]> | null
}

function mapEvaluationRow(
  row: EvaluationRow,
  responses: EvaluationResponse[],
): Evaluation {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    institutionId: row.institution_id,
    institutionLevelId: row.institution_level_id,
    date: row.date,
    managementTeamPresent: row.management_team_present,
    managementTeamContact: row.management_team_contact,
    responses,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    ...(row.closed_at
      ? {
          closedAt: row.closed_at,
        }
      : {}),
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  const evaluationRows = (await sql`
    SELECT
      id,
      version,
      status,
      institution_id,
      institution_level_id,
      date,
      management_team_present,
      management_team_contact,
      created_by,
      updated_by,
      created_at,
      updated_at,
      closed_at
    FROM evaluations
    WHERE id = ${id}
    LIMIT 1
  `) as EvaluationRow[]

  const evaluation = evaluationRows[0]

  if (!evaluation) {
    return Response.json(
      {
        error: "Evaluation not found",
      },
      {
        status: 404,
      },
    )
  }

  const responseRows = (await sql`
    SELECT
      id,
      evaluation_id,
      indicator_id,
      observation,
      urgency,
      strengths,
      fields
    FROM evaluation_responses
    WHERE evaluation_id = ${id}
    ORDER BY indicator_id
  `) as EvaluationResponseRow[]

  const responses: EvaluationResponse[] = responseRows.map((row) => ({
    id: row.id,
    evaluationId: row.evaluation_id,
    indicatorId: row.indicator_id,
    observation: row.observation,
    ...(row.urgency
      ? {
          urgency: row.urgency,
        }
      : {}),
    ...(row.strengths
      ? {
          strengths: row.strengths,
        }
      : {}),
    ...(row.fields
      ? {
          fields: row.fields,
        }
      : {}),
  }))

  return Response.json(
    mapEvaluationRow(evaluation, responses),
  )
}
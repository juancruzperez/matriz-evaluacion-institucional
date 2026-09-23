import { sql } from "@/lib/db"
import type {
  Evaluation,
  EvaluationResponse,
} from "@/types/evaluation"

export type EvaluationScope = {
  roleId?: string | null
  departamento?: string | null
}

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
  responses: EvaluationResponse[]
}

const evaluationSelect = sql`
  SELECT
    e.id,
    e.version,
    e.status,
    e.institution_id,
    e.institution_level_id,
    e.date,
    e.management_team_present,
    e.management_team_contact,
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    e.closed_at,

    COALESCE(
      json_agg(
        json_build_object(
          'id', er.id,
          'evaluationId', er.evaluation_id,
          'indicatorId', er.indicator_id,
          'observation', er.observation,
          'urgency', er.urgency,
          'strengths', er.strengths,
          'fields', er.fields
        )
        ORDER BY er.indicator_id
      ) FILTER (WHERE er.id IS NOT NULL),
      '[]'::json
    ) AS responses

  FROM evaluations e
`

function mapEvaluationRow(
  row: EvaluationRow,
): Evaluation {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    institutionId: row.institution_id,
    institutionLevelId: row.institution_level_id,
    date: row.date,
    managementTeamPresent:
      row.management_team_present,
    managementTeamContact:
      row.management_team_contact,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    ...(row.closed_at
      ? { closedAt: row.closed_at }
      : {}),
    responses: row.responses,
  }
}

export async function getEvaluations(
  scope: EvaluationScope = {},
): Promise<Evaluation[]> {
  const rows =
    scope.roleId === "responsable_territorial"
      ? scope.departamento
        ? await sql`
            ${evaluationSelect}
            INNER JOIN institutions i
              ON i.id = e.institution_id
            LEFT JOIN evaluation_responses er
              ON er.evaluation_id = e.id

            WHERE i.departamento = ${scope.departamento}

            GROUP BY
              e.id,
              e.version,
              e.status,
              e.institution_id,
              e.institution_level_id,
              e.date,
              e.management_team_present,
              e.management_team_contact,
              e.created_by,
              e.updated_by,
              e.created_at,
              e.updated_at,
              e.closed_at

            ORDER BY e.updated_at DESC
          `
        : []
      : await sql`
          ${evaluationSelect}
          LEFT JOIN evaluation_responses er
            ON er.evaluation_id = e.id

          GROUP BY
            e.id,
            e.version,
            e.status,
            e.institution_id,
            e.institution_level_id,
            e.date,
            e.management_team_present,
            e.management_team_contact,
            e.created_by,
            e.updated_by,
            e.created_at,
            e.updated_at,
            e.closed_at

          ORDER BY e.updated_at DESC
        `

  return (rows as EvaluationRow[]).map(mapEvaluationRow)
}
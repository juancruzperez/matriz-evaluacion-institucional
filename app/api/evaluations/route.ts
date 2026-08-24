import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/require-permission"
import type {
  Evaluation,
  EvaluationResponse,
} from "@/types/evaluation"

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

type CreateEvaluationResponseInput = {
  indicatorId: string
  observation?: string
  urgency?: EvaluationResponse["urgency"]
  strengths?: string
  fields?: Record<string, string | string[]>
}

type CreateEvaluationInput = {
  institutionId: string
  institutionLevelId: string | null
  date: string
  managementTeamPresent: boolean | null
  managementTeamContact: string
  responses: CreateEvaluationResponseInput[]
}

const validUrgencies = new Set([
  "alto",
  "medio",
  "bajo",
])

function isValidUrgency(
  value: unknown,
): value is EvaluationResponse["urgency"] {
  return (
    typeof value === "string" &&
    validUrgencies.has(value)
  )
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidResponse(
  value: unknown,
): value is CreateEvaluationResponseInput {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false
  }

  const response =
    value as Record<string, unknown>

  if (
    typeof response.indicatorId !== "string" ||
    response.indicatorId.trim() === ""
  ) {
    return false
  }

  if (
    response.observation !== undefined &&
    typeof response.observation !== "string"
  ) {
    return false
  }

  if (
    response.strengths !== undefined &&
    typeof response.strengths !== "string"
  ) {
    return false
  }

  if (
    response.urgency !== undefined &&
    response.urgency !== null &&
    !isValidUrgency(response.urgency)
  ) {
    return false
  }

  if (
    response.fields !== undefined &&
    (
      typeof response.fields !== "object" ||
      response.fields === null ||
      Array.isArray(response.fields)
    )
  ) {
    return false
  }

  return true
}

function isValidCreateEvaluationInput(
  value: unknown,
): value is CreateEvaluationInput {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false
  }

  const input =
    value as Record<string, unknown>

  if (
    typeof input.institutionId !== "string" ||
    input.institutionId.trim() === ""
  ) {
    return false
  }

  if (
    input.institutionLevelId !== null &&
    input.institutionLevelId !== undefined &&
    typeof input.institutionLevelId !== "string"
  ) {
    return false
  }

  if (!isValidDate(input.date)) {
    return false
  }

  if (
    input.managementTeamPresent !== null &&
    input.managementTeamPresent !== undefined &&
    typeof input.managementTeamPresent !== "boolean"
  ) {
    return false
  }

  if (
    typeof input.managementTeamContact !== "string"
  ) {
    return false
  }

  if (
    !Array.isArray(input.responses) ||
    !input.responses.every(isValidResponse)
  ) {
    return false
  }

  return true
}

export async function GET() {
  const authorization = await requirePermission(
    "evaluation:read",
  )

  if (!authorization.authorized) {
    return Response.json(
      {
        error:
          authorization.status === 401
            ? "Unauthorized"
            : "Forbidden",
      },
      { status: authorization.status },
    )
  }

  const rows = (await sql`
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
  `) as EvaluationRow[]

  const evaluations = rows.map(
    (row) =>
      ({
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
      }) satisfies Evaluation,
  )

  return Response.json(evaluations)
}

export async function POST(request: Request) {
  const authorization = await requirePermission(
    "evaluation:create",
  )

  if (!authorization.authorized) {
    return Response.json(
      {
        error:
          authorization.status === 401
            ? "Unauthorized"
            : "Forbidden",
      },
      { status: authorization.status },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json(
      {
        error: "Invalid JSON body",
      },
      { status: 400 },
    )
  }

  if (!isValidCreateEvaluationInput(body)) {
    return Response.json(
      {
        error: "Invalid evaluation payload",
      },
      { status: 400 },
    )
  }

  const evaluationId = crypto.randomUUID()
  const userId = authorization.session.user.id

  const responseQueries = body.responses.map(
    (response) => {
      const responseId = crypto.randomUUID()

      return sql`
        INSERT INTO evaluation_responses (
          id,
          evaluation_id,
          indicator_id,
          observation,
          urgency,
          strengths,
          fields
        )
        VALUES (
          ${responseId},
          ${evaluationId},
          ${response.indicatorId},
          ${response.observation ?? ""},
          ${response.urgency ?? null},
          ${response.strengths ?? null},
          ${response.fields ?? null}
        )
      `
    },
  )

  try {
    await sql.transaction([
      sql`
        INSERT INTO evaluations (
          id,
          version,
          status,
          institution_id,
          institution_level_id,
          date,
          management_team_present,
          management_team_contact,
          created_by,
          updated_by
        )
        VALUES (
          ${evaluationId},
          1,
          'draft',
          ${body.institutionId},
          ${body.institutionLevelId},
          ${body.date},
          ${body.managementTeamPresent},
          ${body.managementTeamContact},
          ${userId},
          ${userId}
        )
      `,
      ...responseQueries,
    ])
  } catch (error) {
    console.error(
      "Failed to create evaluation",
      error,
    )

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23503"
    ) {
      return Response.json(
        {
          error: "Invalid evaluation reference.",
        },
        { status: 400 },
      )
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505" &&
      "constraint" in error &&
      error.constraint ===
        "evaluations_one_open_per_institution_idx"
    ) {
      return Response.json(
        {
          error:
            "La institución ya tiene un relevamiento abierto.",
        },
        { status: 409 },
      )
    }

    return Response.json(
      {
        error: "Unable to create evaluation",
      },
      { status: 500 },
    )
  }

  const rows = (await sql`
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
    LEFT JOIN evaluation_responses er
      ON er.evaluation_id = e.id
    WHERE e.id = ${evaluationId}
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
    LIMIT 1
  `) as EvaluationRow[]

  const row = rows[0]

  if (!row) {
    return Response.json(
      {
        error: "Evaluation created but could not be loaded",
      },
      { status: 500 },
    )
  }

  const evaluation = {
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
  } satisfies Evaluation

  return Response.json(
    evaluation,
    { status: 201 },
  )
}
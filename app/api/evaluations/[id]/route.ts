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

type UpdateEvaluationResponseInput = {
  indicatorId: string
  observation?: string
  urgency?: EvaluationResponse["urgency"]
  strengths?: string | null
  fields?: Record<string, string | string[]>
}

type UpdateEvaluationInput = {
  institutionId: string
  institutionLevelId: string | null
  date: string
  managementTeamPresent: boolean | null
  managementTeamContact: string
  responses: UpdateEvaluationResponseInput[]
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
    managementTeamPresent:
      row.management_team_present,
    managementTeamContact:
      row.management_team_contact,
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

function normalizeDate(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

function isValidUrgency(
  value: unknown,
): value is EvaluationResponse["urgency"] {
  return (
    value === "alto" ||
    value === "medio" ||
    value === "bajo"
  )
}

function isValidResponse(
  value: unknown,
): value is UpdateEvaluationResponseInput {
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
    response.urgency !== undefined &&
    response.urgency !== null &&
    !isValidUrgency(response.urgency)
  ) {
    return false
  }

  if (
    response.strengths !== undefined &&
    response.strengths !== null &&
    typeof response.strengths !== "string"
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

function isValidUpdateEvaluationInput(
  value: unknown,
): value is UpdateEvaluationInput {
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
    typeof input.institutionLevelId !== "string"
  ) {
    return false
  }

  if (!normalizeDate(input.date)) {
    return false
  }

  if (
    input.managementTeamPresent !== null &&
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

async function loadEvaluation(
  id: string,
): Promise<Evaluation | null> {
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
    return null
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

  const responses: EvaluationResponse[] =
    responseRows.map((row) => ({
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

  return mapEvaluationRow(
    evaluation,
    responses,
  )
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const authorization =
    await requirePermission(
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
      {
        status: authorization.status,
      },
    )
  }

  const { id } = await context.params

  const evaluation =
    await loadEvaluation(id)

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

  return Response.json(evaluation)
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const authorization =
    await requirePermission(
      "evaluation:update",
    )

  if (!authorization.authorized) {
    return Response.json(
      {
        error:
          authorization.status === 401
            ? "Unauthorized"
            : "Forbidden",
      },
      {
        status: authorization.status,
      },
    )
  }

  const { id } = await context.params

  const existing =
    await loadEvaluation(id)

  if (!existing) {
    return Response.json(
      {
        error: "Evaluation not found",
      },
      {
        status: 404,
      },
    )
  }

  if (existing.status === "closed") {
    return Response.json(
      {
        error:
          "Closed evaluations cannot be edited",
      },
      {
        status: 409,
      },
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
      {
        status: 400,
      },
    )
  }

  if (!isValidUpdateEvaluationInput(body)) {
    return Response.json(
      {
        error: "Invalid evaluation payload",
      },
      {
        status: 400,
      },
    )
  }

  const userId =
    authorization.session.user.id

  const nextVersion =
    existing.version + 1

  const responseQueries =
    body.responses.map(
      (response) => {
        const responseId =
          crypto.randomUUID()

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
            ${id},
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
        UPDATE evaluations
        SET
          version = ${nextVersion},
          institution_id =
            ${body.institutionId},
          institution_level_id =
            ${body.institutionLevelId},
          date = ${body.date},
          management_team_present =
            ${body.managementTeamPresent},
          management_team_contact =
            ${body.managementTeamContact},
          updated_by = ${userId},
          updated_at = NOW()
        WHERE id = ${id}
      `,
      sql`
        DELETE FROM evaluation_responses
        WHERE evaluation_id = ${id}
      `,
      ...responseQueries,
    ])
  } catch (error) {
    console.error(
      "Failed to update evaluation",
      error,
    )

    return Response.json(
      {
        error: "Unable to update evaluation",
      },
      {
        status: 500,
      },
    )
  }

  const updated =
    await loadEvaluation(id)

  if (!updated) {
    return Response.json(
      {
        error:
          "Evaluation updated but could not be loaded",
      },
      {
        status: 500,
      },
    )
  }

  return Response.json(updated)
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
  /*
   * Este endpoint existe únicamente para
   * cerrar un relevamiento.
   *
   * El frontend debe enviar:
   *
   * {
   *   "action": "close"
   * }
   */

  const authorization =
    await requirePermission(
      "evaluation:close",
    )

  if (!authorization.authorized) {
    return Response.json(
      {
        error:
          authorization.status === 401
            ? "Unauthorized"
            : "Forbidden",
      },
      {
        status: authorization.status,
      },
    )
  }

  const { id } = await context.params

  const existing =
    await loadEvaluation(id)

  if (!existing) {
    return Response.json(
      {
        error: "Evaluation not found",
      },
      {
        status: 404,
      },
    )
  }

  if (existing.status === "closed") {
    return Response.json(
      {
        error:
          "Evaluation is already closed",
      },
      {
        status: 409,
      },
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
      {
        status: 400,
      },
    )
  }

  if (
    typeof body !== "object" ||
    body === null ||
    (body as Record<string, unknown>).action !==
      "close"
  ) {
    return Response.json(
      {
        error: "Invalid close payload",
      },
      {
        status: 400,
      },
    )
  }

  const userId =
    authorization.session.user.id

  const nextVersion =
    existing.version + 1

  try {
    await sql`
      UPDATE evaluations
      SET
        status = 'closed',
        version = ${nextVersion},
        closed_at = NOW(),
        updated_by = ${userId},
        updated_at = NOW()
      WHERE id = ${id}
        AND status <> 'closed'
    `
  } catch (error) {
    console.error(
      "Failed to close evaluation",
      error,
    )

    return Response.json(
      {
        error: "Unable to close evaluation",
      },
      {
        status: 500,
      },
    )
  }

  const closed =
    await loadEvaluation(id)

  if (!closed) {
    return Response.json(
      {
        error:
          "Evaluation closed but could not be loaded",
      },
      {
        status: 500,
      },
    )
  }

  return Response.json(closed)
}
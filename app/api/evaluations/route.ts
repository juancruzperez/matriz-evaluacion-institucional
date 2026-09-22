import { sql } from "@/lib/db"
import { getEvaluations } from "@/lib/data/evaluations"
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
  observation: string
  urgency?: "alto" | "medio" | "bajo"
  strengths?: string
  fields?: Record<string, string | string[]>
}

type CreateEvaluationInput = {
  institutionId: string
  institutionLevelId?: string | null
  date: string
  managementTeamPresent?: boolean | null
  managementTeamContact?: string
  responses: CreateEvaluationResponseInput[]
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isValidUrgency(
  value: unknown,
): value is "alto" | "medio" | "bajo" {
  return (
    value === "alto" ||
    value === "medio" ||
    value === "bajo"
  )
}

function validateCreateEvaluationInput(
  value: unknown,
): CreateEvaluationInput | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.institutionId !== "string" ||
    value.institutionId.trim() === ""
  ) {
    return null
  }

  if (
    value.institutionLevelId !== undefined &&
    value.institutionLevelId !== null &&
    typeof value.institutionLevelId !== "string"
  ) {
    return null
  }

  if (
    typeof value.date !== "string" ||
    value.date.trim() === ""
  ) {
    return null
  }

  if (
    value.managementTeamPresent !== undefined &&
    value.managementTeamPresent !== null &&
    typeof value.managementTeamPresent !== "boolean"
  ) {
    return null
  }

  if (
    value.managementTeamContact !== undefined &&
    typeof value.managementTeamContact !== "string"
  ) {
    return null
  }

  if (!Array.isArray(value.responses)) {
    return null
  }

  const responses: CreateEvaluationResponseInput[] = []

  for (const response of value.responses) {
    if (!isRecord(response)) {
      return null
    }

    if (
      typeof response.indicatorId !== "string" ||
      response.indicatorId.trim() === ""
    ) {
      return null
    }

    if (
      typeof response.observation !== "string"
    ) {
      return null
    }

    if (
      response.urgency !== undefined &&
      !isValidUrgency(response.urgency)
    ) {
      return null
    }

    if (
      response.strengths !== undefined &&
      typeof response.strengths !== "string"
    ) {
      return null
    }

    if (
      response.fields !== undefined &&
      !isRecord(response.fields)
    ) {
      return null
    }

    responses.push({
      indicatorId: response.indicatorId,
      observation: response.observation,
      ...(response.urgency !== undefined
        ? { urgency: response.urgency }
        : {}),
      ...(response.strengths !== undefined
        ? { strengths: response.strengths }
        : {}),
      ...(response.fields !== undefined
        ? {
            fields:
              response.fields as Record<
                string,
                string | string[]
              >,
          }
        : {}),
    })
  }

  return {
    institutionId: value.institutionId,
    institutionLevelId:
      value.institutionLevelId ?? null,
    date: value.date,
    managementTeamPresent:
      value.managementTeamPresent ?? null,
    managementTeamContact:
      value.managementTeamContact ?? "",
    responses,
  }
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
      {
        status: authorization.status,
      },
    )
  }

  const evaluations = await getEvaluations({
    roleId: authorization.session.user.roleId,
    departamento:
      authorization.session.user.departamento,
  })

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
      {
        status: authorization.status,
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

  const input = validateCreateEvaluationInput(body)

  if (!input) {
    return Response.json(
      {
        error: "Invalid evaluation data",
      },
      {
        status: 400,
      },
    )
  }

  const user = authorization.session.user

  if (user.roleId === "responsable_territorial") {
    if (!user.departamento) {
      return Response.json(
        {
          error:
            "El responsable territorial no tiene un departamento asignado",
        },
        {
          status: 403,
        },
      )
    }

    const institutionRows = await sql`
      SELECT id
      FROM institutions
      WHERE id = ${input.institutionId}
        AND departamento = ${user.departamento}
      LIMIT 1
    `

    if (institutionRows.length === 0) {
      return Response.json(
        {
          error:
            "La institución no pertenece al departamento asignado",
        },
        {
          status: 403,
        },
      )
    }
  }

  const evaluationId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

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
          created_at,
          updated_by,
          updated_at
        )
        VALUES (
          ${evaluationId},
          1,
          'draft',
          ${input.institutionId},
          ${input.institutionLevelId},
          ${input.date},
          ${input.managementTeamPresent},
          ${input.managementTeamContact},
          ${user.id},
          ${createdAt},
          ${user.id},
          ${createdAt}
        )
      `,
      ...input.responses.map((response) => {
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
            ${response.observation},
            ${response.urgency ?? null},
            ${response.strengths ?? null},
            ${response.fields
              ? JSON.stringify(response.fields)
              : null}
          )
        `
      }),
    ])
  } catch (error) {
    if (
      isRecord(error) &&
      error.code === "23503"
    ) {
      return Response.json(
        {
          error:
            "La institución o alguno de los datos relacionados no existe",
        },
        {
          status: 400,
        },
      )
    }

    if (
      isRecord(error) &&
      error.code === "23505"
    ) {
      return Response.json(
        {
          error:
            "La institución ya tiene una evaluación abierta",
        },
        {
          status: 409,
        },
      )
    }

    console.error(
      "Error creating evaluation:",
      error,
    )

    return Response.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    )
  }

  const rows = await sql`
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
  `

  if (rows.length === 0) {
    return Response.json(
      {
        error:
          "Evaluation was created but could not be loaded",
      },
      {
        status: 500,
      },
    )
  }

  const row = rows[0] as EvaluationRow

  const evaluation: Evaluation = {
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

  return Response.json(evaluation, {
    status: 201,
  })
}
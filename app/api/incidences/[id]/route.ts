import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/require-permission"

type IncidenceStatus = "open" | "resolved"

type IncidenceRow = {
  id: string
  evaluation_response_id: string
  evaluation_id: string
  institution_id: string
  status: IncidenceStatus
  resolution_description: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  updated_at: string
  updated_by: string

  urgency: "alto" | "medio" | "bajo" | null
  observation: string
  strengths: string | null
  fields: Record<string, string | string[]> | null

  evaluation_date: string
  evaluation_closed_at: string | null

  institution_name: string
  institution_cue: string
  institution_localidad: string | null
  institution_departamento: string | null

  indicator_id: string
  indicator_name: string | null
  dimension_name: string | null
}

function mapIncidence(row: IncidenceRow) {
  return {
    id: row.id,
    evaluationResponseId:
      row.evaluation_response_id,
    evaluationId: row.evaluation_id,
    institutionId: row.institution_id,

    status: row.status,
    resolutionDescription:
      row.resolution_description,

    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,

    response: {
      urgency: row.urgency,
      observation: row.observation,
      strengths: row.strengths,
      fields: row.fields,
    },

    evaluation: {
      date: row.evaluation_date,
      closedAt: row.evaluation_closed_at,
    },

    institution: {
      id: row.institution_id,
      name: row.institution_name,
      cue: row.institution_cue,
      localidad: row.institution_localidad,
      departamento: row.institution_departamento,
    },

    indicator: {
      id: row.indicator_id,
      name: row.indicator_name,
    },

    dimension: {
      name: row.dimension_name,
    },
  }
}

async function loadIncidence(
  id: string,
): Promise<IncidenceRow | null> {
  const rows = (await sql`
    SELECT
      inc.id,
      inc.evaluation_response_id,
      inc.evaluation_id,
      inc.institution_id,
      inc.status,
      inc.resolution_description,
      inc.created_at,
      inc.resolved_at,
      inc.resolved_by,
      inc.updated_at,
      inc.updated_by,

      er.urgency,
      er.observation,
      er.strengths,
      er.fields,

      e.date AS evaluation_date,
      e.closed_at AS evaluation_closed_at,

      i.name AS institution_name,
      i.cue AS institution_cue,
      i.localidad AS institution_localidad,
      i.departamento AS institution_departamento,

      er.indicator_id,
      ind.title AS indicator_name,
      d.name AS dimension_name

    FROM incidences inc

    INNER JOIN evaluation_responses er
      ON er.id = inc.evaluation_response_id

    INNER JOIN evaluations e
      ON e.id = inc.evaluation_id

    INNER JOIN institutions i
      ON i.id = inc.institution_id

    LEFT JOIN indicators ind
      ON ind.id = er.indicator_id

    LEFT JOIN dimensions d
      ON d.id = ind.dimension_id

    WHERE inc.id = ${id}

    LIMIT 1
  `) as IncidenceRow[]

  return rows[0] ?? null
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
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

  const { id } = await context.params

  const incidence =
    await loadIncidence(id)

  if (!incidence) {
    return Response.json(
      {
        error: "Incidence not found",
      },
      {
        status: 404,
      },
    )
  }

  /*
   * Seguridad territorial:
   * un responsable territorial solamente
   * puede consultar incidencias de su
   * departamento.
   */
  if (
    authorization.session.user.roleId ===
      "responsable_territorial" &&
    incidence.institution_departamento !==
      authorization.session.user.departamento
  ) {
    return Response.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      },
    )
  }

  return Response.json(
    mapIncidence(incidence),
  )
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

  const incidence =
    await loadIncidence(id)

  if (!incidence) {
    return Response.json(
      {
        error: "Incidence not found",
      },
      {
        status: 404,
      },
    )
  }

  /*
   * Seguridad territorial:
   * un responsable territorial solamente
   * puede resolver incidencias de su
   * departamento.
   */
  if (
    authorization.session.user.roleId ===
      "responsable_territorial" &&
    incidence.institution_departamento !==
      authorization.session.user.departamento
  ) {
    return Response.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      },
    )
  }

  if (incidence.status === "resolved") {
    return Response.json(
      {
        error:
          "La incidencia ya se encuentra resuelta.",
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
    body === null
  ) {
    return Response.json(
      {
        error: "Invalid incidence payload",
      },
      {
        status: 400,
      },
    )
  }

  const input =
    body as Record<string, unknown>

  if (
    input.status !== "resolved"
  ) {
    return Response.json(
      {
        error:
          "La única transición disponible actualmente es hacia 'resolved'.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    typeof input.resolutionDescription !==
      "string" ||
    input.resolutionDescription.trim() === ""
  ) {
    return Response.json(
      {
        error:
          "La descripción de resolución es obligatoria.",
      },
      {
        status: 400,
      },
    )
  }

  const resolutionDescription =
    input.resolutionDescription.trim()

  const userId =
    authorization.session.user.id

  try {
    const updatedRows = (await sql`
      UPDATE incidences
      SET
        status = 'resolved',
        resolution_description =
          ${resolutionDescription},
        resolved_at = NOW(),
        resolved_by = ${userId},
        updated_at = NOW(),
        updated_by = ${userId}
      WHERE id = ${id}
        AND status = 'open'
      RETURNING
        id,
        evaluation_response_id,
        evaluation_id,
        institution_id,
        status,
        resolution_description,
        created_at,
        resolved_at,
        resolved_by,
        updated_at,
        updated_by
    `) as {
      id: string
      evaluation_response_id: string
      evaluation_id: string
      institution_id: string
      status: IncidenceStatus
      resolution_description: string | null
      created_at: string
      resolved_at: string | null
      resolved_by: string | null
      updated_at: string
      updated_by: string
    }[]

    if (updatedRows.length === 0) {
      return Response.json(
        {
          error:
            "La incidencia ya no está abierta.",
        },
        {
          status: 409,
        },
      )
    }
  } catch (error) {
    console.error(
      "Failed to resolve incidence",
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
          error:
            "El usuario que intenta resolver la incidencia no es válido.",
        },
        {
          status: 400,
        },
      )
    }

    return Response.json(
      {
        error:
          "Unable to resolve incidence",
      },
      {
        status: 500,
      },
    )
  }

  const updated =
    await loadIncidence(id)

  if (!updated) {
    return Response.json(
      {
        error:
          "Incidence resolved but could not be loaded",
      },
      {
        status: 500,
      },
    )
  }

  return Response.json(
    mapIncidence(updated),
  )
}
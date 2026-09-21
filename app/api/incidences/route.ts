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

  indicator_name: string | null
  dimension_name: string | null
}

function getStatus(
  value: string | null,
): IncidenceStatus | "all" {
  if (value === "open" || value === "resolved") {
    return value
  }

  return "all"
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)

  const requestedStatus = getStatus(
    searchParams.get("status"),
  )

  const roleId = authorization.session.user.roleId
  const departamento =
    authorization.session.user.departamento

  /*
   * Los responsables territoriales solamente
   * pueden consultar incidencias de instituciones
   * pertenecientes a su departamento.
   *
   * Los demás roles mantienen acceso general
   * según su permiso.
   */
  let rows: IncidenceRow[]

  if (roleId === "responsable_territorial") {
    if (!departamento) {
      return Response.json([])
    }

    if (requestedStatus === "all") {
      rows = (await sql`
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

        WHERE i.departamento = ${departamento}

        ORDER BY
          CASE inc.status
            WHEN 'open' THEN 0
            WHEN 'resolved' THEN 1
            ELSE 2
          END,
          inc.created_at DESC
      `) as IncidenceRow[]
    } else {
      rows = (await sql`
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

        WHERE i.departamento = ${departamento}
          AND inc.status = ${requestedStatus}

        ORDER BY inc.created_at DESC
      `) as IncidenceRow[]
    }
  } else {
    if (requestedStatus === "all") {
      rows = (await sql`
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

        ORDER BY
          CASE inc.status
            WHEN 'open' THEN 0
            WHEN 'resolved' THEN 1
            ELSE 2
          END,
          inc.created_at DESC
      `) as IncidenceRow[]
    } else {
      rows = (await sql`
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

        WHERE inc.status = ${requestedStatus}

        ORDER BY inc.created_at DESC
      `) as IncidenceRow[]
    }
  }

  const incidences = rows.map((row) => ({
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
      id: null,
      name: row.indicator_name,
    },

    dimension: {
      name: row.dimension_name,
    },
  }))

  return Response.json(incidences)
}
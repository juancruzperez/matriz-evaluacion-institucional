import { sql } from "@/lib/db"

export type IncidenceStatus =
  | "open"
  | "resolved"

export type IncidenceStatusFilter =
  | IncidenceStatus
  | "all"

export type IncidenceScope = {
  roleId?: string | null
  departamento?: string | null
}

export type Incidence = {
  id: string
  evaluationResponseId: string
  evaluationId: string
  institutionId: string

  status: IncidenceStatus
  resolutionDescription: string | null

  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
  updatedAt: string
  updatedBy: string

  response: {
    urgency: "alto" | "medio" | "bajo" | null
    observation: string
    strengths: string | null
    fields: Record<
      string,
      string | string[]
    > | null
  }

  evaluation: {
    date: string
    closedAt: string | null
  }

  institution: {
    id: string
    name: string
    cue: string
    localidad: string | null
    departamento: string | null
  }

  indicator: {
    id: string | null
    name: string | null
  }

  dimension: {
    name: string | null
  }
}

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

  urgency:
    | "alto"
    | "medio"
    | "bajo"
    | null

  observation: string
  strengths: string | null
  fields: Record<
    string,
    string | string[]
  > | null

  evaluation_date: string
  evaluation_closed_at: string | null

  institution_name: string
  institution_cue: string
  institution_localidad: string | null
  institution_departamento: string | null

  indicator_name: string | null
  dimension_name: string | null
}

function mapIncidenceRow(
  row: IncidenceRow,
): Incidence {
  return {
    id: row.id,

    evaluationResponseId:
      row.evaluation_response_id,

    evaluationId:
      row.evaluation_id,

    institutionId:
      row.institution_id,

    status: row.status,

    resolutionDescription:
      row.resolution_description,

    createdAt: row.created_at,

    resolvedAt:
      row.resolved_at,

    resolvedBy:
      row.resolved_by,

    updatedAt:
      row.updated_at,

    updatedBy:
      row.updated_by,

    response: {
      urgency: row.urgency,
      observation: row.observation,
      strengths: row.strengths,
      fields: row.fields,
    },

    evaluation: {
      date: row.evaluation_date,
      closedAt:
        row.evaluation_closed_at,
    },

    institution: {
      id: row.institution_id,
      name: row.institution_name,
      cue: row.institution_cue,
      localidad:
        row.institution_localidad,
      departamento:
        row.institution_departamento,
    },

    indicator: {
      id: null,
      name: row.indicator_name,
    },

    dimension: {
      name: row.dimension_name,
    },
  }
}

export async function getIncidences(
  scope: IncidenceScope = {},
  status: IncidenceStatusFilter = "all",
): Promise<Incidence[]> {
  let rows: IncidenceRow[]

  if (
    scope.roleId ===
    "responsable_territorial"
  ) {
    if (!scope.departamento) {
      return []
    }

    if (status === "all") {
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

        WHERE i.departamento =
          ${scope.departamento}

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

        WHERE i.departamento =
          ${scope.departamento}

          AND inc.status = ${status}

        ORDER BY inc.created_at DESC
      `) as IncidenceRow[]
    }
  } else {
    if (status === "all") {
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

        WHERE inc.status = ${status}

        ORDER BY inc.created_at DESC
      `) as IncidenceRow[]
    }
  }

  return rows.map(mapIncidenceRow)
}
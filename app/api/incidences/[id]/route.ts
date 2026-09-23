import {
  Pool,
} from "@neondatabase/serverless"

import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/require-permission"

type IncidenceStatus =
  | "open"
  | "resolved"

type IncidenceUrgency =
  | "alto"
  | "medio"
  | "bajo"

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
    | IncidenceUrgency
    | null

  current_urgency:
    IncidenceUrgency

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

  indicator_id: string
  indicator_name: string | null
  dimension_name: string | null
}

function mapIncidence(
  row: IncidenceRow,
) {
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

    currentUrgency:
      row.current_urgency,

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
      inc.current_urgency,

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

  const { id } =
    await context.params

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

  const { id } =
    await context.params

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
   * puede gestionar incidencias de su
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

  /*
   * Las incidencias resueltas quedan
   * cerradas y no pueden modificarse.
   */
  if (
    incidence.status === "resolved"
  ) {
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
        error:
          "Invalid incidence payload",
      },
      {
        status: 400,
      },
    )
  }

  const input =
    body as Record<string, unknown>

  const hasCurrentUrgency =
    Object.prototype.hasOwnProperty.call(
      input,
      "currentUrgency",
    )

  const hasStatus =
    Object.prototype.hasOwnProperty.call(
      input,
      "status",
    )

  const hasResolutionDescription =
    Object.prototype.hasOwnProperty.call(
      input,
      "resolutionDescription",
    )

  const hasReason =
    Object.prototype.hasOwnProperty.call(
      input,
      "reason",
    )

  /*
   * Debe existir al menos una operación.
   */
  if (
    !hasCurrentUrgency &&
    !hasStatus &&
    !hasResolutionDescription
  ) {
    return Response.json(
      {
        error:
          "No se proporcionaron cambios para actualizar.",
      },
      {
        status: 400,
      },
    )
  }

  /*
   * Validación de la nueva urgencia.
   */
  let currentUrgency:
    | IncidenceUrgency
    | undefined

  if (hasCurrentUrgency) {
    if (
      input.currentUrgency !==
        "alto" &&
      input.currentUrgency !==
        "medio" &&
      input.currentUrgency !==
        "bajo"
    ) {
      return Response.json(
        {
          error:
            "La urgencia actual debe ser 'alto', 'medio' o 'bajo'.",
        },
        {
          status: 400,
        },
      )
    }

    currentUrgency =
      input.currentUrgency
  }

  /*
   * Validación del motivo del cambio.
   */
  let reason: string | null = null

  if (hasReason) {
    if (
      typeof input.reason !==
        "string"
    ) {
      return Response.json(
        {
          error:
            "El motivo del cambio debe ser texto.",
        },
        {
          status: 400,
        },
      )
    }

    reason =
      input.reason.trim() || null
  }

  const requestedStatus =
    input.status

  /*
   * Actualmente solamente permitimos
   * la transición open → resolved.
   */
  if (
    requestedStatus !== undefined &&
    requestedStatus !== "resolved"
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

  const isResolving =
    requestedStatus === "resolved"

  /*
   * La descripción solamente es válida
   * cuando se está resolviendo.
   */
  if (
    hasResolutionDescription &&
    !isResolving
  ) {
    return Response.json(
      {
        error:
          "La descripción de resolución solamente puede enviarse al resolver la incidencia.",
      },
      {
        status: 400,
      },
    )
  }

  let resolutionDescription:
    | string
    | null = null

  if (isResolving) {
    if (
      typeof input.resolutionDescription !==
        "string" ||
      input.resolutionDescription.trim() ===
        ""
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

    resolutionDescription =
      input.resolutionDescription.trim()
  }

  /*
   * Si se envía una urgencia, determinamos
   * si realmente cambió.
   */
  const urgencyChanged =
    currentUrgency !== undefined &&
    currentUrgency !==
      incidence.current_urgency

  /*
   * No tiene sentido ejecutar un PATCH
   * que no cambie nada.
   */
  if (
    !urgencyChanged &&
    !isResolving
  ) {
    return Response.json(
      {
        error:
          "La urgencia indicada coincide con la urgencia actual.",
      },
      {
        status: 400,
      },
    )
  }

  const userId =
    authorization.session.user.id

  const databaseUrl =
    process.env.DATABASE_URL

  if (!databaseUrl) {
    return Response.json(
      {
        error:
          "DATABASE_URL is not configured",
      },
      {
        status: 500,
      },
    )
  }

  const pool = new Pool({
    connectionString:
      databaseUrl,
  })

  const client =
    await pool.connect()

  try {
    await client.query(
      "BEGIN",
    )

    /*
     * 1. Actualizar urgencia actual.
     */
    if (urgencyChanged) {
      const updateResult =
        await client.query(
          `
            UPDATE incidences
            SET
              current_urgency = $1,
              updated_at = NOW(),
              updated_by = $2
            WHERE id = $3
              AND status = 'open'
          `,
          [
            currentUrgency,
            userId,
            id,
          ],
        )

      if (
        updateResult.rowCount !== 1
      ) {
        throw new Error(
          "INCIDENCE_UPDATE_CONFLICT",
        )
      }

      /*
       * 2. Registrar el cambio histórico.
       */
      await client.query(
        `
          INSERT INTO incidence_urgency_history (
            id,
            incidence_id,
            previous_urgency,
            new_urgency,
            changed_at,
            changed_by,
            reason
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            NOW(),
            $5,
            $6
          )
        `,
        [
          crypto.randomUUID(),
          id,
          incidence.current_urgency,
          currentUrgency,
          userId,
          reason,
        ],
      )
    }

    /*
     * 3. Resolver la incidencia si corresponde.
     */
    if (isResolving) {
      const resolveResult =
        await client.query(
          `
            UPDATE incidences
            SET
              status = 'resolved',
              resolution_description = $1,
              resolved_at = NOW(),
              resolved_by = $2,
              updated_at = NOW(),
              updated_by = $2
            WHERE id = $3
              AND status = 'open'
          `,
          [
            resolutionDescription,
            userId,
            id,
          ],
        )

      if (
        resolveResult.rowCount !== 1
      ) {
        throw new Error(
          "INCIDENCE_RESOLVE_CONFLICT",
        )
      }
    }

    await client.query(
      "COMMIT",
    )
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK",
      )
    } catch (rollbackError) {
      console.error(
        "Failed to rollback incidence transaction",
        rollbackError,
      )
    }

    console.error(
      "Failed to update incidence",
      error,
    )

    if (
      error instanceof Error &&
      error.message ===
        "INCIDENCE_UPDATE_CONFLICT"
    ) {
      return Response.json(
        {
          error:
            "La incidencia ya no está abierta o fue modificada por otro usuario.",
        },
        {
          status: 409,
        },
      )
    }

    if (
      error instanceof Error &&
      error.message ===
        "INCIDENCE_RESOLVE_CONFLICT"
    ) {
      return Response.json(
        {
          error:
            "La incidencia ya no está abierta o fue modificada por otro usuario.",
        },
        {
          status: 409,
        },
      )
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23503"
    ) {
      return Response.json(
        {
          error:
            "El usuario que intenta actualizar la incidencia no es válido.",
        },
        {
          status: 400,
        },
      )
    }

    return Response.json(
      {
        error:
          "Unable to update incidence",
      },
      {
        status: 500,
      },
    )
  } finally {
    client.release()

    try {
      await pool.end()
    } catch (error) {
      console.error(
        "Failed to close incidence database pool",
        error,
      )
    }
  }

  const updated =
    await loadIncidence(id)

  if (!updated) {
    return Response.json(
      {
        error:
          "Incidence updated but could not be loaded",
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
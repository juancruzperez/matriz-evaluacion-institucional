import { requirePermission } from "@/lib/require-permission"
import {
  getOpenIncidencesReport,
  type OpenIncidenceReportFilters,
} from "@/lib/reports/incidences"
import type { IncidenceUrgency } from "@/lib/data/incidences"

const VALID_URGENCIES: IncidenceUrgency[] = [
  "alto",
  "medio",
  "bajo",
]

function getOptionalParam(
  searchParams: URLSearchParams,
  name: string,
): string | undefined {
  const value =
    searchParams.get(name)?.trim()

  return value || undefined
}

function parseFilters(
  searchParams: URLSearchParams,
):
  | {
      filters: OpenIncidenceReportFilters
    }
  | {
      error: string
    } {
  const departamento =
    getOptionalParam(
      searchParams,
      "departamento",
    )

  const localidad =
    getOptionalParam(
      searchParams,
      "localidad",
    )

  const urgency =
    getOptionalParam(
      searchParams,
      "urgency",
    ) as IncidenceUrgency | undefined

  const from =
    getOptionalParam(
      searchParams,
      "from",
    )

  const to =
    getOptionalParam(
      searchParams,
      "to",
    )

  if (
    urgency &&
    !VALID_URGENCIES.includes(
      urgency,
    )
  ) {
    return {
      error:
        "El filtro urgency debe ser alto, medio o bajo.",
    }
  }

  if (from) {
    const fromDate = new Date(
      `${from}T00:00:00`,
    )

    if (
      Number.isNaN(
        fromDate.getTime(),
      )
    ) {
      return {
        error:
          "El parámetro from no tiene una fecha válida. Use YYYY-MM-DD.",
      }
    }
  }

  if (to) {
    const toDate = new Date(
      `${to}T23:59:59.999`,
    )

    if (
      Number.isNaN(
        toDate.getTime(),
      )
    ) {
      return {
        error:
          "El parámetro to no tiene una fecha válida. Use YYYY-MM-DD.",
      }
    }
  }

  if (from && to) {
    const fromDate = new Date(
      `${from}T00:00:00`,
    )

    const toDate = new Date(
      `${to}T23:59:59.999`,
    )

    if (
      fromDate.getTime() >
      toDate.getTime()
    ) {
      return {
        error:
          "El período indicado es inválido: from no puede ser posterior a to.",
      }
    }
  }

  return {
    filters: {
      departamento,
      localidad,
      urgency,
      from,
      to,
    },
  }
}

export async function GET(
  request: Request,
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
        status:
          authorization.status,
      },
    )
  }

  const url = new URL(
    request.url,
  )

  const parsedFilters =
    parseFilters(
      url.searchParams,
    )

  if ("error" in parsedFilters) {
    return Response.json(
      {
        error: parsedFilters.error,
      },
      {
        status: 400,
      },
    )
  }

  try {
    const roleId =
      authorization.session.user.roleId

    const departamento =
      authorization.session.user.departamento

    const report =
      await getOpenIncidencesReport(
        {
          roleId,
          departamento,
        },
        parsedFilters.filters,
      )

    return Response.json(report)
  } catch (error) {
    console.error(
      "Error generating open incidences report:",
      error,
    )

    return Response.json(
      {
        error:
          "No se pudo generar el informe de incidencias abiertas.",
      },
      {
        status: 500,
      },
    )
  }
}
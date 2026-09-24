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

function escapeCsvValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return '""'
  }

  const text = String(value)

  return `"${text.replaceAll(
    '"',
    '""',
  )}"`
}

function formatDate(
  value: string,
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Argentina/Cordoba",
    },
  ).format(date)
}

function buildCsv(
  rows: Awaited<
    ReturnType<
      typeof getOpenIncidencesReport
    >
  >["rows"],
): string {
  const headers = [
    "ID incidencia",
    "ID institución",
    "CUE",
    "Institución",
    "Departamento",
    "Localidad",
    "Dimensión",
    "Indicador",
    "Contexto",
    "Criticidad original",
    "Criticidad actual",
    "Fecha de generación",
    "Fecha última modificación",
    "Generado por",
  ]

  const lines = [
    headers
      .map(escapeCsvValue)
      .join(";"),
  ]

  for (const row of rows) {
    const values = [
      row.incidenceId,
      row.institutionId,
      row.cue,
      row.institutionName,
      row.departamento,
      row.localidad,
      row.dimensionName,
      row.indicatorName,
      row.context,
      row.originalUrgency,
      row.currentUrgency,
      formatDate(row.createdAt),
      formatDate(row.updatedAt),
      row.generatedBy,
    ]

    lines.push(
      values
        .map(escapeCsvValue)
        .join(";"),
    )
  }

  /*
   * BOM UTF-8:
   * permite que Excel en Windows reconozca
   * correctamente caracteres como á, é, í,
   * ó, ú y ñ.
   */
  return `\uFEFF${lines.join("\r\n")}`
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
        error:
          parsedFilters.error,
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

    const csv =
      buildCsv(report.rows)

    const filename =
      `informe-incidencias-abiertas-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`

    return new Response(
      csv,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "no-store",
        },
      },
    )
  } catch (error) {
    console.error(
      "Error generating incidences CSV:",
      error,
    )

    return Response.json(
      {
        error:
          "No se pudo generar el informe CSV de incidencias abiertas.",
      },
      {
        status: 500,
      },
    )
  }
}
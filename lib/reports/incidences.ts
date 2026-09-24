import {
  getIncidences,
  type Incidence,
  type IncidenceScope,
  type IncidenceUrgency,
} from "@/lib/data/incidences"

export type OpenIncidenceReportFilters = {
  departamento?: string
  localidad?: string
  urgency?: IncidenceUrgency
  from?: string
  to?: string
}

export type OpenIncidenceReportRow = {
  incidenceId: string

  institutionId: string
  institutionName: string
  cue: string

  departamento: string | null
  localidad: string | null

  dimensionName: string
  indicatorName: string

  context: string

  originalUrgency: IncidenceUrgency | null
  currentUrgency: IncidenceUrgency

  createdAt: string
  updatedAt: string

  generatedBy: string
}

export type OpenIncidenceReportInstitution = {
  institutionId: string
  institutionName: string
  cue: string

  departamento: string | null
  localidad: string | null

  highestUrgency: IncidenceUrgency

  incidences: OpenIncidenceReportRow[]
}

export type OpenIncidenceReportTotals = {
  institutions: number
  incidences: number
  high: number
  medium: number
  low: number
}

export type OpenIncidencesReport = {
  generatedAt: string

  filters: OpenIncidenceReportFilters

  totals: OpenIncidenceReportTotals

  institutions: OpenIncidenceReportInstitution[]

  rows: OpenIncidenceReportRow[]
}

const URGENCY_ORDER: Record<
  IncidenceUrgency,
  number
> = {
  alto: 0,
  medio: 1,
  bajo: 2,
}

function compareUrgency(
  a: IncidenceUrgency,
  b: IncidenceUrgency,
): number {
  return (
    URGENCY_ORDER[a] -
    URGENCY_ORDER[b]
  )
}

function normalizeText(
  value: string | null | undefined,
): string {
  return (
    value
      ?.trim()
      .toLocaleLowerCase("es") ?? ""
  )
}

function normalizeFilter(
  value: string | undefined,
): string | undefined {
  const normalized =
    value?.trim()

  return normalized
    ? normalized
    : undefined
}

function parseDate(
  value: string,
): number | null {
  const timestamp =
    new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? null
    : timestamp
}

function isWithinDateRange(
  incidence: Incidence,
  from?: string,
  to?: string,
): boolean {
  const createdAt =
    parseDate(incidence.createdAt)

  if (createdAt === null) {
    return false
  }

  if (from) {
    const fromDate =
      new Date(
        `${from}T00:00:00`,
      )

    if (
      Number.isNaN(
        fromDate.getTime(),
      )
    ) {
      return false
    }

    if (
      createdAt <
      fromDate.getTime()
    ) {
      return false
    }
  }

  if (to) {
    const toDate =
      new Date(
        `${to}T23:59:59.999`,
      )

    if (
      Number.isNaN(
        toDate.getTime(),
      )
    ) {
      return false
    }

    if (
      createdAt >
      toDate.getTime()
    ) {
      return false
    }
  }

  return true
}

function matchesFilters(
  incidence: Incidence,
  filters: OpenIncidenceReportFilters,
): boolean {
  const departamento =
    normalizeFilter(
      filters.departamento,
    )

  if (
    departamento &&
    normalizeText(
      incidence.institution
        .departamento,
    ) !== normalizeText(departamento)
  ) {
    return false
  }

  const localidad =
    normalizeFilter(
      filters.localidad,
    )

  if (
    localidad &&
    normalizeText(
      incidence.institution.localidad,
    ) !== normalizeText(localidad)
  ) {
    return false
  }

  if (
    filters.urgency &&
    incidence.currentUrgency !==
      filters.urgency
  ) {
    return false
  }

  if (
    !isWithinDateRange(
      incidence,
      filters.from,
      filters.to,
    )
  ) {
    return false
  }

  return true
}

function getContext(
  incidence: Incidence,
): string {
  return (
    incidence.response.observation?.trim() ||
    "Sin contexto registrado."
  )
}

function getGeneratedBy(
  incidence: Incidence,
): string {
  return (
    incidence.updatedByName?.trim() ||
    "Usuario no identificado"
  )
}

function mapIncidenceToReportRow(
  incidence: Incidence,
): OpenIncidenceReportRow {
  return {
    incidenceId: incidence.id,

    institutionId:
      incidence.institution.id,

    institutionName:
      incidence.institution.name,

    cue: incidence.institution.cue,

    departamento:
      incidence.institution.departamento,

    localidad:
      incidence.institution.localidad,

    dimensionName:
      incidence.dimension.name ??
      "Sin dimensión",

    indicatorName:
      incidence.indicator.name ??
      "Sin indicador",

    context:
      getContext(incidence),

    originalUrgency:
      incidence.response.urgency,

    currentUrgency:
      incidence.currentUrgency,

    createdAt:
      incidence.createdAt,

    updatedAt:
      incidence.updatedAt,

    generatedBy:
      getGeneratedBy(incidence),
  }
}

function getHighestUrgency(
  incidences: OpenIncidenceReportRow[],
): IncidenceUrgency {
  let highest: IncidenceUrgency =
    "bajo"

  for (const incidence of incidences) {
    if (
      compareUrgency(
        incidence.currentUrgency,
        highest,
      ) < 0
    ) {
      highest =
        incidence.currentUrgency
    }
  }

  return highest
}

function compareRows(
  a: OpenIncidenceReportRow,
  b: OpenIncidenceReportRow,
): number {
  const urgencyComparison =
    compareUrgency(
      a.currentUrgency,
      b.currentUrgency,
    )

  if (
    urgencyComparison !== 0
  ) {
    return urgencyComparison
  }

  const institutionComparison =
    a.institutionName.localeCompare(
      b.institutionName,
      "es",
      {
        sensitivity: "base",
      },
    )

  if (
    institutionComparison !== 0
  ) {
    return institutionComparison
  }

  const createdAtA =
    parseDate(a.createdAt) ?? 0

  const createdAtB =
    parseDate(b.createdAt) ?? 0

  return createdAtB - createdAtA
}

function groupByInstitution(
  rows: OpenIncidenceReportRow[],
): OpenIncidenceReportInstitution[] {
  const groups =
    new Map<
      string,
      OpenIncidenceReportRow[]
    >()

  for (const row of rows) {
    const existing =
      groups.get(row.institutionId)

    if (existing) {
      existing.push(row)
    } else {
      groups.set(row.institutionId, [
        row,
      ])
    }
  }

  return Array.from(
    groups.entries(),
  )
    .map(
      ([
        institutionId,
        incidences,
      ]) => {
        const sortedIncidences =
          [...incidences].sort(
            compareRows,
          )

        const first =
          sortedIncidences[0]

        return {
          institutionId,

          institutionName:
            first.institutionName,

          cue: first.cue,

          departamento:
            first.departamento,

          localidad:
            first.localidad,

          highestUrgency:
            getHighestUrgency(
              sortedIncidences,
            ),

          incidences:
            sortedIncidences,
        }
      },
    )
    .sort(
      (
        a,
        b,
      ) => {
        const urgencyComparison =
          compareUrgency(
            a.highestUrgency,
            b.highestUrgency,
          )

        if (
          urgencyComparison !== 0
        ) {
          return urgencyComparison
        }

        return a.institutionName.localeCompare(
          b.institutionName,
          "es",
          {
            sensitivity: "base",
          },
        )
      },
    )
}

function calculateTotals(
  rows: OpenIncidenceReportRow[],
  institutions: OpenIncidenceReportInstitution[],
): OpenIncidenceReportTotals {
  return {
    institutions:
      institutions.length,

    incidences:
      rows.length,

    high:
      rows.filter(
        (row) =>
          row.currentUrgency ===
          "alto",
      ).length,

    medium:
      rows.filter(
        (row) =>
          row.currentUrgency ===
          "medio",
      ).length,

    low:
      rows.filter(
        (row) =>
          row.currentUrgency ===
          "bajo",
      ).length,
  }
}

export async function getOpenIncidencesReport(
  scope: IncidenceScope = {},
  filters: OpenIncidenceReportFilters = {},
): Promise<OpenIncidencesReport> {
  const normalizedFilters: OpenIncidenceReportFilters =
    {
      departamento:
        normalizeFilter(
          filters.departamento,
        ),

      localidad:
        normalizeFilter(
          filters.localidad,
        ),

      urgency:
        filters.urgency,

      from:
        normalizeFilter(
          filters.from,
        ),

      to:
        normalizeFilter(
          filters.to,
        ),
    }

  const incidences =
    await getIncidences(
      scope,
      "open",
    )

  const filteredIncidences =
    incidences.filter(
      (incidence) =>
        incidence.status === "open" &&
        matchesFilters(
          incidence,
          normalizedFilters,
        ),
    )

  const rows =
    filteredIncidences
      .map(
        mapIncidenceToReportRow,
      )
      .sort(compareRows)

  const institutions =
    groupByInstitution(rows)

  const totals =
    calculateTotals(
      rows,
      institutions,
    )

  return {
    generatedAt:
      new Date().toISOString(),

    filters:
      normalizedFilters,

    totals,

    institutions,

    rows,
  }
}
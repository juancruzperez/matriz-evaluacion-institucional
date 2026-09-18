"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"

import {
  criticalityFromScore,
  URGENCY_WEIGHT,
  type Criticality,
} from "@/lib/criticality"
import type { Evaluation, Urgency } from "@/types/evaluation"
import type { Institution } from "@/types/institution"

type TerritoryFilter =
  | "all"
  | `department:${string}`
  | `circuit:${number}`

type CriticalityFilter = "all" | Criticality

type TimeFilter = "all" | "week" | "month" | "custom"

type SectionFeature = {
  type: "Feature"
  properties?: {
    NUMERO?: number | string
    [key: string]: unknown
  }
  geometry: unknown
}

type SectionGeoJSON = {
  type: "FeatureCollection"
  features: SectionFeature[]
}

const CRITICALITY_ORDER: Record<Criticality, number> = {
  alta: 0,
  media: 1,
  baja: 2,
  "sin-relevamiento": 3,
}

const CRITICALITY_COLORS: Record<Criticality, string> = {
  alta: "#BF1363",
  media: "#FFE066",
  baja: "#43AA8B",
  "sin-relevamiento": "#C1B8C8",
}


function normalizeDepartmentName(
  value: string | null | undefined,
) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es")
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "Fecha no disponible"
  }

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return "Fecha no disponible"
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function parseDateOnly(date: string) {
  const [year, month, day] = date.split("-").map(Number)

  return new Date(year, month - 1, day)
}

function getClosedDate(evaluation: Evaluation) {
  return evaluation.closedAt
}

function getEvaluationCriticality(
  evaluation: Evaluation,
): Criticality {
  const scores = evaluation.responses
    .map((response) => response.urgency)
    .filter(
      (urgency): urgency is Urgency =>
        Boolean(urgency),
    )
    .map((urgency) => URGENCY_WEIGHT[urgency])

  if (!scores.length) {
    return "sin-relevamiento"
  }

  const score =
    scores.reduce((sum, value) => sum + value, 0) /
    scores.length

  return criticalityFromScore(score)
}

function getDateRange(
  timeFilter: TimeFilter,
  customFrom: string,
  customTo: string,
) {
  if (timeFilter === "all") {
    return null
  }

  if (timeFilter === "custom") {
    if (!customFrom && !customTo) {
      return null
    }

    const from = customFrom
      ? parseDateOnly(customFrom)
      : null

    const to = customTo
      ? parseDateOnly(customTo)
      : null

    if (from) {
      from.setHours(0, 0, 0, 0)
    }

    if (to) {
      to.setHours(23, 59, 59, 999)
    }

    return {
      from,
      to,
    }
  }

  const now = new Date()

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  )

  const days = timeFilter === "week" ? 7 : 30

  const start = new Date(end)

  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  return {
    from: start,
    to: end,
  }
}

export default function RelevamientosPage() {
  const [evaluations, setEvaluations] = useState<
    Evaluation[]
  >([])

  const [institutions, setInstitutions] = useState<
    Institution[]
  >([])

  const [sections, setSections] =
    useState<SectionGeoJSON | null>(null)

  const [territoryFilter, setTerritoryFilter] =
    useState<TerritoryFilter>("all")

  const [criticalityFilter, setCriticalityFilter] =
    useState<CriticalityFilter>("all")

  const [timeFilter, setTimeFilter] =
    useState<TimeFilter>("all")

  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  const [institutionId, setInstitutionId] =
    useState("all")

  const [query, setQuery] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        const [
          evaluationsResponse,
          institutionsResponse,
          sectionsResponse,
        ] = await Promise.all([
          fetch("/api/evaluations", {
            cache: "no-store",
            signal: controller.signal,
          }),

          fetch("/api/institutions", {
            cache: "no-store",
            signal: controller.signal,
          }),

          fetch(
            "/data/geography/capital-secciones.geojson",
            {
              cache: "no-store",
              signal: controller.signal,
            },
          ),
        ])

        if (!evaluationsResponse.ok) {
          throw new Error(
            "No se pudieron cargar los relevamientos.",
          )
        }

        if (!institutionsResponse.ok) {
          throw new Error(
            "No se pudieron cargar las instituciones.",
          )
        }

        if (!sectionsResponse.ok) {
          throw new Error(
            "No se pudieron cargar los circuitos de Capital.",
          )
        }

        const evaluationsData =
          (await evaluationsResponse.json()) as Evaluation[]

        const institutionsData =
          (await institutionsResponse.json()) as Institution[]

        const sectionsData =
          (await sectionsResponse.json()) as SectionGeoJSON

        if (controller.signal.aborted) {
          return
        }

        setEvaluations(evaluationsData)
        setInstitutions(institutionsData)
        setSections(sectionsData)
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        console.error(
          "Error al cargar relevamientos e instituciones",
          error,
        )

        setEvaluations([])
        setInstitutions([])
        setSections(null)
      }
    }

    void loadData()

    return () => {
      controller.abort()
    }
  }, [])

  const filteredInstitutions = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("es")

    if (!normalized) {
      return institutions
    }

    return institutions.filter((institution) =>
      institution.name
        .toLocaleLowerCase("es")
        .includes(normalized),
    )
  }, [institutions, query])

  const departmentOptions = useMemo(() => {
    const values = new Map<string, string>()

    for (const institution of institutions) {
      const department =
        institution.departamento?.trim()

      if (!department) {
        continue
      }

      const normalized =
        normalizeDepartmentName(department)

      if (!values.has(normalized)) {
        values.set(normalized, department)
      }
    }

    return Array.from(values.values()).sort((a, b) =>
      a.localeCompare(b, "es"),
    )
  }, [institutions])

  const institutionCircuitMap = useMemo(() => {
    const result = new Map<string, number>()

    if (!sections) {
      return result
    }

    for (const institution of institutions) {
      if (
        normalizeDepartmentName(
          institution.departamento,
        ) !== "capital"
      ) {
        continue
      }

      if (
        institution.latitude === null ||
        institution.longitude === null
      ) {
        continue
      }

      const latitude = institution.latitude
      const longitude = institution.longitude

      const section = sections.features.find((feature) =>
        booleanPointInPolygon(
          [longitude, latitude],
          feature as never,
        ),
      )

      const number = section?.properties?.NUMERO

      if (
        number === undefined ||
        number === null
      ) {
        continue
      }

      const circuitNumber = Number(number)

      if (Number.isFinite(circuitNumber)) {
        result.set(
          institution.id,
          circuitNumber,
        )
      }
    }

    return result
  }, [institutions, sections])

  const selectedTerritoryLabel = useMemo(() => {
    if (territoryFilter === "all") {
      return "Toda la provincia"
    }

    if (
      territoryFilter.startsWith("department:")
    ) {
      return territoryFilter.slice(
        "department:".length,
      )
    }

    if (
      territoryFilter.startsWith("circuit:")
    ) {
      return `Capital — Circuito ${territoryFilter.slice(
        "circuit:".length,
      )}`
    }

    return "Toda la provincia"
  }, [territoryFilter])

  const filteredEvaluations = useMemo(() => {
    const dateRange = getDateRange(
      timeFilter,
      customFrom,
      customTo,
    )

    const latestByInstitution = new Map<
  string,
  Evaluation
>()

for (const evaluation of evaluations) {
  // Esta página trabaja exclusivamente con
  // relevamientos cerrados.
  if (evaluation.status !== "closed") {
    continue
  }

  const current =
    latestByInstitution.get(
      evaluation.institutionId,
    )

  if (!current) {
    latestByInstitution.set(
      evaluation.institutionId,
      evaluation,
    )

    continue
  }

  const evaluationDate =
    new Date(evaluation.date).getTime()

  const currentDate =
    new Date(current.date).getTime()

  const isMoreRecent =
    evaluationDate > currentDate ||
    (evaluationDate === currentDate &&
      evaluation.version > current.version)

  if (isMoreRecent) {
    latestByInstitution.set(
      evaluation.institutionId,
      evaluation,
    )
  }
}

const result = Array.from(
  latestByInstitution.values(),
)
  // Una consulta por institución.
  .filter((evaluation) => {
    if (institutionId === "all") {
      return true
    }

    return (
      evaluation.institutionId ===
      institutionId
    )
  })

  // Filtro territorial.
  .filter((evaluation) => {
        if (territoryFilter === "all") {
          return true
        }

        const institution = institutions.find(
          (item) =>
            item.id === evaluation.institutionId,
        )

        if (!institution) {
          return false
        }

        if (
          territoryFilter.startsWith(
            "department:",
          )
        ) {
          const selectedDepartment =
            territoryFilter.slice(
              "department:".length,
            )

          return (
            normalizeDepartmentName(
              institution.departamento,
            ) ===
            normalizeDepartmentName(
              selectedDepartment,
            )
          )
        }

        if (
          territoryFilter.startsWith("circuit:")
        ) {
          if (
            normalizeDepartmentName(
              institution.departamento,
            ) !== "capital"
          ) {
            return false
          }

          const selectedCircuit = Number(
            territoryFilter.slice(
              "circuit:".length,
            ),
          )

          return (
            institutionCircuitMap.get(
              institution.id,
            ) === selectedCircuit
          )
        }

        return true
      })

      // Filtro por criticidad.
      .filter((evaluation) => {
        if (criticalityFilter === "all") {
          return true
        }

        return (
          getEvaluationCriticality(
            evaluation,
          ) === criticalityFilter
        )
      })

      // Filtro temporal utilizando la fecha
      // efectiva de cierre.
      .filter((evaluation) => {
        if (!dateRange) {
          return true
        }

        const closedDate =
          getClosedDate(evaluation)

        if (!closedDate) {
          return false
        }

        const parsed = new Date(closedDate)

        if (Number.isNaN(parsed.getTime())) {
          return false
        }

        if (
          dateRange.from &&
          parsed < dateRange.from
        ) {
          return false
        }

        if (
          dateRange.to &&
          parsed > dateRange.to
        ) {
          return false
        }

        return true
      })

    /*
     * Orden de lectura:
     *
     * 1. Fecha de finalización, más antigua primero.
     * 2. Ante la misma fecha, criticidad:
     *    Alta → Media → Baja.
     *
     * De esta manera los relevamientos críticos
     * que llevan más tiempo cerrados aparecen
     * primero.
     */
    return result.sort((a, b) => {
      const dateA = new Date(
        getClosedDate(a) ?? 0,
      ).getTime()

      const dateB = new Date(
        getClosedDate(b) ?? 0,
      ).getTime()

      if (dateA !== dateB) {
        return dateA - dateB
      }

      const criticalityA =
        getEvaluationCriticality(a)

      const criticalityB =
        getEvaluationCriticality(b)

      return (
        CRITICALITY_ORDER[criticalityA] -
        CRITICALITY_ORDER[criticalityB]
      )
    })
  }, [
    evaluations,
    institutions,
    institutionId,
    territoryFilter,
    institutionCircuitMap,
    criticalityFilter,
    timeFilter,
    customFrom,
    customTo,
  ])

  const clearFilters = () => {
    setTerritoryFilter("all")
    setCriticalityFilter("all")
    setTimeFilter("all")
    setCustomFrom("")
    setCustomTo("")
    setInstitutionId("all")
    setQuery("")
  }

  const getInstitutionTerritory = (
    institution: Institution | undefined,
  ) => {
    if (!institution) {
      return null
    }

    const department =
      institution.departamento?.trim()

    const locality =
      institution.localidad?.trim()

    const circuit =
      institutionCircuitMap.get(
        institution.id,
      )

    const parts: string[] = []

    if (department) {
      parts.push(department)
    }

    if (
      normalizeDepartmentName(department) ===
        "capital" &&
      circuit
    ) {
      parts.push(`Circuito ${circuit}`)
    }

    if (locality) {
      parts.push(locality)
    }

    if (!parts.length) {
      return null
    }

    return parts.join(" · ")
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Territorio
          </p>

          <h1>Relevamientos</h1>

          <p className="muted">
            Relevamientos finalizados y
            ordenados por antigüedad y
            criticidad.
          </p>
        </div>

        <Link
          className="primary-button"
          href="/relevamientos/nuevo"
        >
          Nuevo relevamiento
        </Link>
      </header>

      <section className="form-card relevamientos-filters">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              FILTROS
            </p>

            <h2>
              Consultar relevamientos
            </h2>
          </div>

          <button
            type="button"
            className="text-link"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="field-grid">
          <div>
            <label
              htmlFor="relevamientos-institution-search"
            >
              Institución
            </label>

            <input
              id="relevamientos-institution-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)

                if (
                  !event.target.value
                ) {
                  setInstitutionId("all")
                }
              }}
              placeholder="Buscar institución..."
            />

            <div className="filter-results">
              <button
                type="button"
                className={
                  institutionId === "all"
                    ? "filter-option selected"
                    : "filter-option"
                }
                onClick={() =>
                  setInstitutionId("all")
                }
              >
                Todas las instituciones
              </button>

              {query &&
                filteredInstitutions
                  .slice(0, 6)
                  .map((institution) => (
                    <button
                      key={institution.id}
                      type="button"
                      className={
                        institutionId ===
                        institution.id
                          ? "filter-option selected"
                          : "filter-option"
                      }
                      onClick={() => {
                        setInstitutionId(
                          institution.id,
                        )
                        setQuery(
                          institution.name,
                        )
                      }}
                    >
                      {institution.name}
                    </button>
                  ))}
            </div>
          </div>

          <div>
            <label htmlFor="relevamientos-territory">
              Departamento / circuito
            </label>

            <select
              id="relevamientos-territory"
              value={territoryFilter}
              onChange={(event) =>
                setTerritoryFilter(
                  event.target
                    .value as TerritoryFilter,
                )
              }
            >
              <option value="all">
                Toda la provincia
              </option>

              <optgroup label="Departamentos">
                {departmentOptions.map(
                  (department) => (
                    <option
                      key={department}
                      value={`department:${department}`}
                    >
                      {department}
                    </option>
                  ),
                )}
              </optgroup>

              <optgroup label="Capital — circuitos">
                {Array.from(
                  { length: 14 },
                  (_, index) => {
                    const circuit =
                      index + 1

                    return (
                      <option
                        key={circuit}
                        value={`circuit:${circuit}`}
                      >
                        Capital — Circuito{" "}
                        {circuit}
                      </option>
                    )
                  },
                )}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="relevamientos-criticality">
              Criticidad
            </label>

            <select
              id="relevamientos-criticality"
              value={criticalityFilter}
              onChange={(event) =>
                setCriticalityFilter(
                  event.target
                    .value as CriticalityFilter,
                )
              }
            >
              <option value="all">
                Todas las criticidades
              </option>

              <option value="alta">
                Alta
              </option>

              <option value="media">
                Media
              </option>

              <option value="baja">
                Baja
              </option>

              <option value="sin-relevamiento">
                Sin criticidad registrada
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="relevamientos-time">
              Período de finalización
            </label>

            <select
              id="relevamientos-time"
              value={timeFilter}
              onChange={(event) =>
                setTimeFilter(
                  event.target
                    .value as TimeFilter,
                )
              }
            >
              <option value="all">
                Todo el período
              </option>

              <option value="week">
                Última semana
              </option>

              <option value="month">
                Último mes
              </option>

              <option value="custom">
                Seleccionar fechas
              </option>
            </select>
          </div>
        </div>

        {timeFilter === "custom" && (
          <div className="field-grid">
            <div>
              <label htmlFor="relevamientos-date-from">
                Desde
              </label>

              <input
                id="relevamientos-date-from"
                type="date"
                value={customFrom}
                onChange={(event) =>
                  setCustomFrom(
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label htmlFor="relevamientos-date-to">
                Hasta
              </label>

              <input
                id="relevamientos-date-to"
                type="date"
                value={customTo}
                min={
                  customFrom || undefined
                }
                onChange={(event) =>
                  setCustomTo(
                    event.target.value,
                  )
                }
              />
            </div>
          </div>
        )}

        <div
          className="muted"
          style={{
            marginTop: "1rem",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <span>
            Territorio:{" "}
            <strong>
              {selectedTerritoryLabel}
            </strong>
          </span>

          <span>
            {filteredEvaluations.length}{" "}
            relevamiento
            {filteredEvaluations.length === 1
              ? ""
              : "s"}
          </span>
        </div>
      </section>

      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              RESULTADOS
            </p>

            <h2>
              {filteredEvaluations.length}{" "}
              relevamiento
              {filteredEvaluations.length ===
              1
                ? ""
                : "s"}
            </h2>
          </div>

          <span className="muted">
            Más antiguos primero
          </span>
        </div>

        {filteredEvaluations.length ===
        0 ? (
          <p>
            No hay relevamientos
            finalizados que coincidan
            con los filtros seleccionados.
          </p>
        ) : (
          <div className="saved-list">
            {filteredEvaluations.map(
              (evaluation) => {
                const institution =
                  institutions.find(
                    (item) =>
                      item.id ===
                      evaluation.institutionId,
                  )

                const criticality =
                  getEvaluationCriticality(
                    evaluation,
                  )

                const closedDate =
                  getClosedDate(evaluation)

                const territory =
                  getInstitutionTerritory(
                    institution,
                  )

                return (
                  <div
                    className="saved-item"
                    key={evaluation.id}
                    style={{
                      border:
                        "1px solid #E3E0E6",
                      borderLeft: `5px solid ${CRITICALITY_COLORS[criticality]}`,
                      padding:
                        "0.85rem 1rem",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          whiteSpace:
                            "nowrap",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                        }}
                      >
                        {institution?.name ??
                          "Institución no encontrada"}
                      </strong>

                      <span
                        className="muted"
                        style={{
                          display: "block",
                          marginTop:
                            "0.2rem",
                          whiteSpace:
                            "nowrap",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                        }}
                      >
                        Finalizado el{" "}
                        {formatDate(
                          closedDate,
                        )}

                        {territory
                          ? ` · ${territory}`
                          : ""}
                      </span>
                    </div>

                    <Link
                      className="text-link"
                      href={`/relevamientos/nuevo?evaluation=${evaluation.id}`}
                      style={{
                        flexShrink: 0,
                      }}
                    >
                      Consultar →
                    </Link>
                  </div>
                )
              },
            )}
          </div>
        )}
      </section>
    </main>
  )
}
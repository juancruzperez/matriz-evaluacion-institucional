"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"

import {
  criticalityFromScore,
  URGENCY_WEIGHT,
  type Criticality,
} from "@/lib/criticality"
import { dimensions } from "@/lib/evaluation-template"
import type {
  Evaluation,
  EvaluationResponse,
} from "@/types/evaluation"
import type { Institution } from "@/types/institution"

type TerritoryFilter =
  | "all"
  | `department:${string}`
  | `circuit:${number}`

type CriticalityFilter = "all" | Criticality

type TimeFilter =
  | "all"
  | "week"
  | "month"
  | "custom"

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

type Incidence = {
  evaluation: Evaluation
  response: EvaluationResponse
  institution: Institution | undefined
  criticality: Criticality
  dimensionNumber: string
  dimensionTitle: string
  indicatorTitle: string
  indicatorDescription: string
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

const CRITICALITY_LABELS: Record<Criticality, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  "sin-relevamiento": "Sin criticidad",
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

function formatDate(
  date: string | null | undefined,
) {
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
  const [year, month, day] =
    date.split("-").map(Number)

  return new Date(year, month - 1, day)
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

  const days =
    timeFilter === "week" ? 7 : 30

  const start = new Date(end)

  start.setDate(
    start.getDate() - (days - 1),
  )

  start.setHours(0, 0, 0, 0)

  return {
    from: start,
    to: end,
  }
}

function getResponseCriticality(
  response: EvaluationResponse,
): Criticality {
  if (!response.urgency) {
    return "sin-relevamiento"
  }

  return criticalityFromScore(
    URGENCY_WEIGHT[response.urgency],
  )
}

function getResponseContext(
  response: EvaluationResponse,
) {
  const context: string[] = []

  if (response.observation?.trim()) {
    context.push(response.observation.trim())
  }

  if (response.strengths?.trim()) {
    context.push(response.strengths.trim())
  }

  if (response.fields) {
    for (const [key, value] of Object.entries(
      response.fields,
    )) {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        continue
      }

      const formattedValue =
        Array.isArray(value)
          ? value.join(", ")
          : String(value)

      if (!formattedValue.trim()) {
        continue
      }

      context.push(
        `${key}: ${formattedValue}`,
      )
    }
  }

  return context
}

export default function IncidenciasPage() {
  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([])

  const [institutions, setInstitutions] =
    useState<Institution[]>([])

  const [sections, setSections] =
    useState<SectionGeoJSON | null>(null)

  const [territoryFilter, setTerritoryFilter] =
    useState<TerritoryFilter>("all")

  const [criticalityFilter, setCriticalityFilter] =
    useState<CriticalityFilter>("all")

  const [timeFilter, setTimeFilter] =
    useState<TimeFilter>("all")

  const [customFrom, setCustomFrom] =
    useState("")

  const [customTo, setCustomTo] =
    useState("")

  const [institutionId, setInstitutionId] =
    useState("all")

  const [query, setQuery] = useState("")

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    const controller =
      new AbortController()

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

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
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }

        console.error(
          "Error al cargar incidencias",
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al cargar los datos.",
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
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

    return institutions.filter(
      (institution) => {
        const searchableText = [
          institution.name,
          institution.localidad ?? "",
          institution.departamento ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("es")

        return searchableText.includes(
          normalized,
        )
      },
    )
  }, [institutions, query])

  const departmentOptions = useMemo(() => {
    const values = new Map<
      string,
      string
    >()

    for (const institution of institutions) {
      const department =
        institution.departamento?.trim()

      if (!department) {
        continue
      }

      const normalized =
        normalizeDepartmentName(
          department,
        )

      if (!values.has(normalized)) {
        values.set(
          normalized,
          department,
        )
      }
    }

    return Array.from(values.values()).sort(
      (a, b) =>
        a.localeCompare(b, "es"),
    )
  }, [institutions])

  const institutionCircuitMap = useMemo(() => {
    const result = new Map<
      string,
      number
    >()

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

      const latitude =
        institution.latitude

      const longitude =
        institution.longitude

      const section =
        sections.features.find(
          (feature) =>
            booleanPointInPolygon(
              [longitude, latitude],
              feature as never,
            ),
        )

      const number =
        section?.properties?.NUMERO

      if (
        number === undefined ||
        number === null
      ) {
        continue
      }

      const circuitNumber =
        Number(number)

      if (
        Number.isFinite(circuitNumber)
      ) {
        result.set(
          institution.id,
          circuitNumber,
        )
      }
    }

    return result
  }, [institutions, sections])

  const selectedTerritoryLabel =
    useMemo(() => {
      if (territoryFilter === "all") {
        return "Toda la provincia"
      }

      if (
        territoryFilter.startsWith(
          "department:",
        )
      ) {
        return territoryFilter.slice(
          "department:".length,
        )
      }

      if (
        territoryFilter.startsWith(
          "circuit:",
        )
      ) {
        return `Capital — Circuito ${territoryFilter.slice(
          "circuit:".length,
        )}`
      }

      return "Toda la provincia"
    }, [territoryFilter])

  /*
   * Primero obtenemos el último relevamiento
   * cerrado de cada institución.
   *
   * Recién después desagregamos sus respuestas
   * para construir las incidencias.
   */
  const latestByInstitution = useMemo(() => {
    const latest =
      new Map<string, Evaluation>()

    for (const evaluation of evaluations) {
      if (
        evaluation.status !== "closed"
      ) {
        continue
      }

      const current =
        latest.get(
          evaluation.institutionId,
        )

      if (!current) {
        latest.set(
          evaluation.institutionId,
          evaluation,
        )

        continue
      }

      const evaluationDate =
        new Date(
          evaluation.date,
        ).getTime()

      const currentDate =
        new Date(
          current.date,
        ).getTime()

      const isMoreRecent =
        evaluationDate > currentDate ||
        (evaluationDate ===
          currentDate &&
          evaluation.version >
            current.version)

      if (isMoreRecent) {
        latest.set(
          evaluation.institutionId,
          evaluation,
        )
      }
    }

    return latest
  }, [evaluations])

  const incidences = useMemo(() => {
    const dateRange = getDateRange(
      timeFilter,
      customFrom,
      customTo,
    )

    const result: Incidence[] = []

    for (const evaluation of latestByInstitution.values()) {
      /*
       * Filtro por institución.
       */
      if (
        institutionId !== "all" &&
        evaluation.institutionId !==
          institutionId
      ) {
        continue
      }

      const institution =
        institutions.find(
          (item) =>
            item.id ===
            evaluation.institutionId,
        )

      if (!institution) {
        continue
      }

      /*
       * Filtro territorial.
       */
      if (
        territoryFilter !== "all"
      ) {
        if (
          territoryFilter.startsWith(
            "department:",
          )
        ) {
          const selectedDepartment =
            territoryFilter.slice(
              "department:".length,
            )

          if (
            normalizeDepartmentName(
              institution.departamento,
            ) !==
            normalizeDepartmentName(
              selectedDepartment,
            )
          ) {
            continue
          }
        }

        if (
          territoryFilter.startsWith(
            "circuit:",
          )
        ) {
          if (
            normalizeDepartmentName(
              institution.departamento,
            ) !== "capital"
          ) {
            continue
          }

          const selectedCircuit =
            Number(
              territoryFilter.slice(
                "circuit:".length,
              ),
            )

          if (
            institutionCircuitMap.get(
              institution.id,
            ) !== selectedCircuit
          ) {
            continue
          }
        }
      }

      /*
       * El filtro temporal se aplica
       * al último relevamiento cerrado
       * de la institución.
       */
      if (dateRange) {
        const closedDate =
          evaluation.closedAt

        if (!closedDate) {
          continue
        }

        const parsed =
          new Date(closedDate)

        if (
          Number.isNaN(
            parsed.getTime(),
          )
        ) {
          continue
        }

        if (
          dateRange.from &&
          parsed < dateRange.from
        ) {
          continue
        }

        if (
          dateRange.to &&
          parsed > dateRange.to
        ) {
          continue
        }
      }

      /*
       * Una incidencia corresponde a una
       * respuesta que tenga una criticidad
       * explícita.
       *
       * Por lo tanto:
       *
       * alto  → Alta
       * medio → Media
       * bajo  → Baja
       *
       * Las respuestas sin urgency no generan
       * una incidencia.
       */
      for (const response of evaluation.responses) {
        if (!response.urgency) {
          continue
        }

        const criticality =
          getResponseCriticality(
            response,
          )

        if (
          criticalityFilter !==
            "all" &&
          criticality !==
            criticalityFilter
        ) {
          continue
        }

        const dimension =
          dimensions.find((item) =>
            item.indicators.some(
              (indicator) =>
                indicator.id ===
                response.indicatorId,
            ),
          )

        if (!dimension) {
          continue
        }

        const indicator =
          dimension.indicators.find(
            (item) =>
              item.id ===
              response.indicatorId,
          )

        if (!indicator) {
          continue
        }

        result.push({
          evaluation,
          response,
          institution,
          criticality,
          dimensionNumber:
            dimension.number,
          dimensionTitle:
            dimension.title,
          indicatorTitle:
            indicator.title,
          indicatorDescription:
            indicator.description,
        })
      }
    }

    /*
     * Orden:
     *
     * 1. Alta
     * 2. Media
     * 3. Baja
     *
     * Dentro de la misma criticidad,
     * primero los relevamientos más recientes.
     */
    result.sort((a, b) => {
      const criticalityDifference =
        CRITICALITY_ORDER[
          a.criticality
        ] -
        CRITICALITY_ORDER[
          b.criticality
        ]

      if (
        criticalityDifference !== 0
      ) {
        return criticalityDifference
      }

      const dateA = new Date(
        a.evaluation.closedAt ??
          a.evaluation.date,
      ).getTime()

      const dateB = new Date(
        b.evaluation.closedAt ??
          b.evaluation.date,
      ).getTime()

      if (dateA !== dateB) {
        return dateB - dateA
      }

      return (
        a.institution?.name ??
        ""
      ).localeCompare(
        b.institution?.name ?? "",
        "es",
      )
    })

    return result
  }, [
    latestByInstitution,
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
    institution:
      | Institution
      | undefined,
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
      normalizeDepartmentName(
        department,
      ) === "capital" &&
      circuit
    ) {
      parts.push(
        `Circuito ${circuit}`,
      )
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
      <style jsx>{`
        .incidence-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .incidence-card {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr)
            minmax(0, 1fr);
          border: 1px solid #e3e0e6;
          border-left: 5px solid;
          background: #ffffff;
          min-height: 190px;
        }

        .incidence-column {
          min-width: 0;
          padding: 1.15rem 1.25rem;
        }

        .incidence-column
          + .incidence-column {
          border-left: 1px solid #e3e0e6;
        }

        .incidence-institution {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
        }

        .incidence-dimension {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.7rem;
        }

        .incidence-result {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .incidence-institution-name {
          display: block;
          font-size: 0.95rem;
          line-height: 1.35;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .incidence-context {
          font-size: 0.9rem;
          line-height: 1.5;
          color: #230c0f;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .incidence-context-label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.72rem;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #667077;
        }

        .incidence-dimension-label {
          font-size: 0.82rem;
          line-height: 1.4;
          color: #52606a;
        }

        .incidence-indicator {
          font-size: 1rem;
          line-height: 1.35;
          font-weight: 700;
        }

        .incidence-description {
          font-size: 0.92rem;
          line-height: 1.5;
          color: #52606a;
        }

        .incidence-criticality {
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          min-height: 30px;
          padding: 0.35rem 0.8rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .incidence-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .incidence-date {
          font-size: 0.78rem;
          line-height: 1.4;
          color: #667077;
        }

        .incidence-link {
          flex-shrink: 0;
          color: #230c0f;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
        }

        .incidence-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 900px) {
          .incidence-card {
            grid-template-columns:
              minmax(0, 1fr)
              minmax(0, 1fr);
          }

          .incidence-result {
            grid-column: 1 / -1;
            border-top: 1px solid #e3e0e6;
          }

          .incidence-column
            + .incidence-column {
            border-left: none;
          }

          .incidence-dimension {
            border-left: 1px solid #e3e0e6;
          }
        }

        @media (max-width: 640px) {
          .incidence-card {
            display: flex;
            flex-direction: column;
          }

          .incidence-column {
            padding: 1rem;
          }

          .incidence-dimension {
            border-left: none;
            border-top: 1px solid #e3e0e6;
          }

          .incidence-result {
            border-top: 1px solid #e3e0e6;
          }

          .incidence-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <header className="topbar">
        <div>
          <p className="eyebrow">
            Territorio
          </p>

          <h1>Incidencias</h1>

          <p className="muted">
            Situaciones relevadas por
            indicador, ordenadas por
            criticidad.
          </p>
        </div>

        <Link
          className="primary-button"
          href="/relevamientos"
        >
          Ver relevamientos
        </Link>
      </header>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              FILTROS
            </p>

            <h2>
              Consultar incidencias
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
            <label htmlFor="incidencias-institution-search">
              Institución
            </label>

            <input
              id="incidencias-institution-search"
              value={query}
              onChange={(event) => {
                setQuery(
                  event.target.value,
                )

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
                      <span
                        style={{
                          display: "block",
                          fontWeight: 600,
                        }}
                      >
                        {institution.name}
                      </span>

                      <span
                        className="muted"
                        style={{
                          display: "block",
                          marginTop:
                            "0.15rem",
                          fontSize:
                            "0.78rem",
                        }}
                      >
                        {[
                          institution.localidad,
                          institution.departamento,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))}
            </div>
          </div>

          <div>
            <label htmlFor="incidencias-territory">
              Departamento / circuito
            </label>

            <select
              id="incidencias-territory"
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
            <label htmlFor="incidencias-criticality">
              Criticidad
            </label>

            <select
              id="incidencias-criticality"
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
            </select>
          </div>

          <div>
            <label htmlFor="incidencias-time">
              Período de finalización
            </label>

            <select
              id="incidencias-time"
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
              <label htmlFor="incidencias-date-from">
                Desde
              </label>

              <input
                id="incidencias-date-from"
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
              <label htmlFor="incidencias-date-to">
                Hasta
              </label>

              <input
                id="incidencias-date-to"
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
            {incidences.length}{" "}
            incidencia
            {incidences.length === 1
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
              {incidences.length}{" "}
              incidencia
              {incidences.length === 1
                ? ""
                : "s"}
            </h2>
          </div>

          <span className="muted">
            Alta → Media → Baja
          </span>
        </div>

        {loading ? (
          <p className="muted">
            Cargando incidencias...
          </p>
        ) : error ? (
          <p>
            {error}
          </p>
        ) : incidences.length === 0 ? (
          <p className="muted">
            No hay incidencias que
            coincidan con los filtros
            seleccionados.
          </p>
        ) : (
          <div className="incidence-list">
            {incidences.map(
              (incidence) => {
                const {
                  evaluation,
                  response,
                  institution,
                  criticality,
                  dimensionNumber,
                  dimensionTitle,
                  indicatorTitle,
                  indicatorDescription,
                } = incidence

                const context =
                  getResponseContext(
                    response,
                  )

                const territory =
                  getInstitutionTerritory(
                    institution,
                  )

                const criticalityColor =
                  CRITICALITY_COLORS[
                    criticality
                  ]

                return (
                  <article
                    className="incidence-card"
                    key={`${evaluation.id}-${response.id}`}
                    style={{
                      borderLeftColor:
                        criticalityColor,
                    }}
                  >
                    {/* =====================================================
                        1. DATOS INSTITUCIONALES
                    ====================================================== */}
                    <div className="incidence-column incidence-institution">
                      <div>
                        <span className="incidence-context-label">
                          Institución
                        </span>

                        <strong className="incidence-institution-name">
                          {institution?.name ??
                            "Institución no encontrada"}
                        </strong>

                        {territory && (
                          <p
                            className="muted"
                            style={{
                              margin:
                                "0.5rem 0 0",
                              lineHeight:
                                1.45,
                            }}
                          >
                            {territory}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="incidence-context-label">
                          Relevamiento
                        </span>

                        <p
                          style={{
                            margin: 0,
                            fontSize:
                              "0.9rem",
                            fontWeight: 600,
                            lineHeight:
                              1.4,
                          }}
                        >
                          Gestión de
                          Evaluación
                        </p>

                        <p
                          className="muted"
                          style={{
                            margin:
                              "0.2rem 0 0",
                            fontSize:
                              "0.78rem",
                          }}
                        >
                          Cerrado el{" "}
                          {formatDate(
                            evaluation.closedAt ??
                              evaluation.date,
                          )}
                        </p>
                      </div>
                    </div>

                    {/* =====================================================
                        2. DIMENSIÓN / INDICADOR
                    ====================================================== */}
                    <div className="incidence-column incidence-dimension">
                      <div>
                        <span className="incidence-context-label">
                          Dimensión
                        </span>

                        <div className="incidence-dimension-label">
                          Dimensión{" "}
                          {dimensionNumber}{" "}
                          ·{" "}
                          {dimensionTitle}
                        </div>
                      </div>

                      <div>
                        <span className="incidence-context-label">
                          Indicador
                        </span>

                        <strong className="incidence-indicator">
                          {indicatorTitle}
                        </strong>
                      </div>

                      <div>
                        <span className="incidence-context-label">
                          Descripción
                        </span>

                        <div className="incidence-description">
                          {
                            indicatorDescription
                          }
                        </div>
                      </div>
                    </div>

                    {/* =====================================================
                        3. RESULTADO / CONTEXTO
                    ====================================================== */}
                    <div className="incidence-column incidence-result">
                      <div>
                        <span className="incidence-context-label">
                          Criticidad
                        </span>

                        <span
                          className="incidence-criticality"
                          style={{
                            backgroundColor:
                              criticalityColor,
                            color:
                              criticality ===
                              "media"
                                ? "#230C0F"
                                : "#ffffff",
                          }}
                        >
                          {
                            CRITICALITY_LABELS[
                              criticality
                            ]
                          }
                        </span>
                      </div>

                      <div>
                        <span className="incidence-context-label">
                          Contexto
                        </span>

                        {context.length >
                        0 ? (
                          <div>
                            {context.map(
                              (
                                item,
                                index,
                              ) => (
                                <p
                                  className="incidence-context"
                                  key={`${response.id}-context-${index}`}
                                  style={{
                                    margin:
                                      index ===
                                      0
                                        ? 0
                                        : "0.45rem 0 0",
                                  }}
                                >
                                  {item}
                                </p>
                              ),
                            )}
                          </div>
                        ) : (
                          <p
                            className="muted"
                            style={{
                              margin: 0,
                            }}
                          >
                            Sin
                            información
                            adicional.
                          </p>
                        )}
                      </div>

                      <div className="incidence-footer">
                        <span className="incidence-date">
                          Relevamiento
                          cerrado:{" "}
                          {formatDate(
                            evaluation.closedAt ??
                              evaluation.date,
                          )}
                        </span>

                        <Link
                          className="incidence-link"
                          href={`/relevamientos/nuevo?evaluation=${evaluation.id}`}
                        >
                          Consultar
                          relevamiento
                          {" →"}
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>
    </main>
  )
}
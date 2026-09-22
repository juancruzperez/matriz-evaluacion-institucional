"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import useSWR from "swr"

import { fetcher } from "@/lib/fetcher"
import {
  calculateInstitutionAssessment,
  URGENCY_WEIGHT,
  type Criticality,
  type CriticalityIncidence,
} from "@/lib/criticality"
import type { Evaluation, Urgency } from "@/types/evaluation"
import type { Institution } from "@/types/institution"

const criticalityOrder: Record<Criticality, number> = {
  alta: 0,
  media: 1,
  baja: 2,
  "sin-relevamiento": 3,
}

const urgencyWeight: Record<Urgency, number> = URGENCY_WEIGHT

function criticalityLabel(value: Criticality) {
  if (value === "sin-relevamiento") {
    return "Sin relevamiento"
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function parseDate(date: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number)

    return new Date(year, month - 1, day)
  }

  return new Date(date)
}

function daysSince(date: string | null) {
  if (!date) return null

  const last = parseDate(date)

  if (Number.isNaN(last.getTime())) {
    return null
  }

  const today = new Date()

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  const lastDay = new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate(),
  )

  const diff = Math.floor(
    (startOfToday.getTime() - lastDay.getTime()) / 86400000,
  )

  return Math.max(0, diff)
}

function formatDate(date: string) {
  const parsed = parseDate(date)

  if (Number.isNaN(parsed.getTime())) {
    return "Fecha no disponible"
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function urgencyLabel(value?: Urgency) {
  if (!value) return "Sin urgencia registrada"

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function criticalityFromScore(score: number | null): Criticality {
  if (score === null) {
    return "sin-relevamiento"
  }

  if (score >= 0.75) {
    return "alta"
  }

  if (score >= 0.5) {
    return "media"
  }

  return "baja"
}

function googleMapsUrl(
  latitude: number | null,
  longitude: number | null,
) {
  if (latitude === null || longitude === null) {
    return null
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`
}

type InstitutionIncidence = CriticalityIncidence & {
  resolutionDescription: string | null
  observation: string
  indicatorName: string
  dimensionName: string
}

export default function InstitutionsPage() {
  const {
    data: institutions,
    error: institutionsError,
    isLoading: institutionsLoading,
  } = useSWR<Institution[]>(
    "/api/institutions",
    fetcher,
  )

  const {
    data: evaluationsData,
    error: evaluationsError,
    isLoading: evaluationsLoading,
  } = useSWR<Evaluation[]>(
    "/api/evaluations",
    fetcher,
  )

  const {
    data: incidencesData,
    error: incidencesError,
    isLoading: incidencesLoading,
  } = useSWR<unknown>(
    "/api/incidences?status=all",
    fetcher,
  )

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")

  const [sectorFilter, setSectorFilter] = useState("todas")
  const [departamentoFilter, setDepartamentoFilter] = useState("todos")
  const [localidadFilter, setLocalidadFilter] = useState("todas")
  const [ambitoFilter, setAmbitoFilter] = useState("todos")

  const [criticalityFilter, setCriticalityFilter] =
    useState<Criticality | "todas">("todas")

  const institutionsForView = useMemo(
    () => institutions ?? [],
    [institutions],
  )

  const evaluations = useMemo(() => {
    return (
      evaluationsData?.map((evaluation) => ({
        ...evaluation,
        status: evaluation.status ?? "draft",
      })) ?? []
    )
  }, [evaluationsData])

  const incidences = useMemo<InstitutionIncidence[]>(() => {
    const rows = Array.isArray(incidencesData)
      ? incidencesData
      : (
          incidencesData as {
            incidences?: unknown
          } | undefined
        )?.incidences ?? []

    return (rows as Array<{
      id: string
      institutionId: string
      evaluationId: string
      evaluationResponseId: string
      status: "open" | "resolved"
      resolutionDescription: string | null
      createdAt: string
      resolvedAt: string | null
      currentUrgency?: Urgency | null
      response?: {
        urgency?: Urgency | null
        observation?: string | null
      } | null
      indicator?: {
        id: string | null
        name: string | null
      } | null
      dimension?: {
        name: string | null
      } | null
    }>).map((incidence) => ({
      id: incidence.id,
      institutionId: incidence.institutionId,
      evaluationId: incidence.evaluationId,
      evaluationResponseId: incidence.evaluationResponseId,
      status: incidence.status,
      createdAt: incidence.createdAt,
      resolvedAt: incidence.resolvedAt,
      currentUrgency: incidence.currentUrgency ?? null,
      resolutionDescription:
        incidence.resolutionDescription ?? null,
      observation:
        incidence.response?.observation?.trim() ?? "",
      indicatorName:
        incidence.indicator?.name ??
        "Indicador no disponible",
      dimensionName:
        incidence.dimension?.name ??
        "Dimensión no disponible",
    }))
  }, [incidencesData])

  const institutionsErrorMessage =
    institutionsError instanceof Error
      ? institutionsError.message
      : institutionsError
        ? "No se pudieron cargar los datos institucionales."
        : null

  const dataErrorMessage =
    evaluationsError instanceof Error
      ? evaluationsError.message
      : incidencesError instanceof Error
        ? incidencesError.message
        : evaluationsError || incidencesError
          ? "No se pudieron cargar todos los datos institucionales."
          : null

  const assessments = useMemo(() => {
    return institutionsForView
      .map((institution) => ({
        institution,
        assessment: calculateInstitutionAssessment(
          institution.id,
          evaluations,
          incidences,
        ),
        institutionEvaluations: evaluations
          .filter(
            (evaluation) =>
              evaluation.institutionId === institution.id,
          )
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) ||
              b.version - a.version,
          ),
      }))
      .sort((a, b) => {
        const categoryDifference =
          criticalityOrder[a.assessment.criticality] -
          criticalityOrder[b.assessment.criticality]

        if (categoryDifference !== 0) {
          return categoryDifference
        }

        return (
          (b.assessment.score ?? -1) -
          (a.assessment.score ?? -1)
        )
      })
  }, [evaluations, institutionsForView, incidences])

  const normalizeSearchText = (value: string) =>
    value
      .toLocaleLowerCase("es-AR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim()

  const filterOptions = useMemo(() => {
    const sectors = Array.from(
      new Set(
        institutionsForView
          .map((institution) => institution.sector)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "es-AR"))

    const departamentos = Array.from(
      new Set(
        institutionsForView
          .map((institution) => institution.departamento)
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    ).sort((a, b) => a.localeCompare(b, "es-AR"))

    const localidades = Array.from(
      new Set(
        institutionsForView
          .filter(
            (institution) =>
              departamentoFilter === "todos" ||
              institution.departamento ===
                departamentoFilter,
          )
          .map((institution) => institution.localidad)
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    ).sort((a, b) => a.localeCompare(b, "es-AR"))

    const ambitos = Array.from(
      new Set(
        institutionsForView
          .map((institution) => institution.ambito)
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    ).sort((a, b) => a.localeCompare(b, "es-AR"))

    return {
      sectors,
      departamentos,
      localidades,
      ambitos,
    }
  }, [institutionsForView, departamentoFilter])

  const filteredAssessments = useMemo(() => {
    const query = normalizeSearchText(searchQuery.trim())

    return assessments.filter(
      ({ institution, assessment }) => {
        const searchableText = normalizeSearchText(
          [
            institution.name,
            institution.cue,
            institution.address,
            institution.localidad,
            institution.departamento,
            institution.ambito,
            institution.sector,
            institution.directivo?.nombre,
            ...institution.telefono,
            ...institution.email,
            ...institution.levels.flatMap((level) => [
              level.level,
              level.modalidad ?? "",
              level.empresa ?? "",
              ...(level.studyPlans ?? []).map(
                (plan) => plan.nombre,
              ),
            ]),
          ]
            .filter(Boolean)
            .join(" "),
        )

        const matchesSearch =
          !query || searchableText.includes(query)

        const matchesSector =
          sectorFilter === "todas" ||
          institution.sector === sectorFilter

        const matchesDepartamento =
          departamentoFilter === "todos" ||
          institution.departamento === departamentoFilter

        const matchesLocalidad =
          localidadFilter === "todas" ||
          institution.localidad === localidadFilter

        const matchesAmbito =
          ambitoFilter === "todos" ||
          institution.ambito === ambitoFilter

        const matchesCriticality =
          criticalityFilter === "todas" ||
          assessment.criticality === criticalityFilter

        return (
          matchesSearch &&
          matchesSector &&
          matchesDepartamento &&
          matchesLocalidad &&
          matchesAmbito &&
          matchesCriticality
        )
      },
    )
  }, [
    assessments,
    searchQuery,
    sectorFilter,
    departamentoFilter,
    localidadFilter,
    ambitoFilter,
    criticalityFilter,
  ])

  const counts = useMemo(() => {
    return assessments.reduce(
      (acc, item) => {
        acc[item.assessment.criticality] += 1
        return acc
      },
      {
        alta: 0,
        media: 0,
        baja: 0,
        "sin-relevamiento": 0,
      } as Record<Criticality, number>,
    )
  }, [assessments])

  const criticalityFilters = [
    {
      value: "todas" as const,
      label: "Todas",
      count: assessments.length,
    },
    {
      value: "alta" as const,
      label: "Alta",
      count: counts.alta,
    },
    {
      value: "media" as const,
      label: "Media",
      count: counts.media,
    },
    {
      value: "baja" as const,
      label: "Baja",
      count: counts.baja,
    },
    {
      value: "sin-relevamiento" as const,
      label: "Sin relevamiento",
      count: counts["sin-relevamiento"],
    },
  ]

  const hasInstitutionFilters =
    sectorFilter !== "todas" ||
    departamentoFilter !== "todos" ||
    localidadFilter !== "todas" ||
    ambitoFilter !== "todos"

  const hasAnyFilters =
    searchQuery.trim() !== "" ||
    hasInstitutionFilters ||
    criticalityFilter !== "todas"

  const clearFilters = () => {
    setSearchQuery("")
    setSectorFilter("todas")
    setDepartamentoFilter("todos")
    setLocalidadFilter("todas")
    setAmbitoFilter("todos")
    setCriticalityFilter("todas")
  }

  return (
    <main className="shell">
      <style jsx>{`
        .context-incidence-count {
          font-size: 0.8rem;
          color: #667077;
          font-weight: 600;
        }

        .institution-incidences {
          display: grid;
          gap: 0.7rem;
        }

        .institution-incidence {
          border: 1px solid #e3e0e6;
          border-left: 4px solid #52606a;
          background: #ffffff;
          padding: 0.85rem 1rem;
        }

        .institution-incidence.is-resolved {
          border-color: #d5d5d5;
          border-left-color: #9aa0a6;
          background: #f3f3f2;
        }

        .institution-incidence-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .institution-incidence-heading > div {
          min-width: 0;
          display: grid;
          gap: 0.2rem;
        }

        .institution-incidence-heading strong {
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .institution-incidence-dimension {
          font-size: 0.72rem;
          line-height: 1.3;
          color: #667077;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }

        .institution-incidence-status {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0.25rem 0.7rem;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .institution-incidence-status.alta {
          background: #bf1363;
          color: #ffffff;
        }

        .institution-incidence-status.media {
          background: #ffe066;
          color: #230c0f;
        }

        .institution-incidence-status.baja {
          background: #43aa8b;
          color: #ffffff;
        }

        .institution-incidence-status.resolved {
          background: #e3e0e6;
          color: #52606a;
        }

        .institution-incidence-meta {
          display: grid;
          gap: 0.35rem;
          margin-top: 0.7rem;
          padding-top: 0.65rem;
          border-top: 1px solid #e3e0e6;
          color: #52606a;
          font-size: 0.82rem;
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .institution-incidence-heading {
            flex-direction: column;
          }

          .institution-incidence-status {
            align-self: flex-start;
          }
        }
      `}</style>
      <header className="topbar">
        <div>
          <Link className="back-link" href="/">
            ← Dashboard
          </Link>

          <p className="eyebrow">zona de accion</p>

          <h1>Instituciones</h1>

          <p className="muted">
            Instituciones del territorio ordenadas por criticidad.
          </p>
        </div>

        <Link
          className="primary-button"
          href="/relevamientos/nuevo"
        >
          Nuevo relevamiento
        </Link>
      </header>

      <section className="institution-summary-bar">
        {(institutionsLoading ||
          evaluationsLoading ||
          incidencesLoading) && (
          <p className="muted">
            Cargando datos institucionales...
          </p>
        )}

        {(institutionsErrorMessage || dataErrorMessage) && (
          <p className="muted">
            {institutionsErrorMessage ??
              dataErrorMessage}
          </p>
        )}

        <div>
          <strong>{institutionsForView.length}</strong>
          <span>Instituciones</span>
        </div>

        <div>
          <strong>{counts.alta}</strong>
          <span>Criticidad alta</span>
        </div>

        <div>
          <strong>{counts.media}</strong>
          <span>Criticidad media</span>
        </div>

        <div>
          <strong>{counts.baja}</strong>
          <span>Criticidad baja</span>
        </div>

        <div>
          <strong>{counts["sin-relevamiento"]}</strong>
          <span>Sin relevamiento</span>
        </div>
      </section>

      <section
        className="institution-search-section"
        aria-label="Buscar y filtrar instituciones"
      >
        <div className="institution-search">
          <div className="institution-search-input-wrap">
            <input
              id="institution-search"
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Buscar por cualquier dato institucional..."
              autoComplete="off"
            />

            {searchQuery && (
              <button
                type="button"
                className="institution-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          <div className="institution-filter-group">
            <div
              className="institution-filter-options"
              role="group"
              aria-label="Filtros institucionales"
            >
              <label className="institution-filter-field">
                <span>Sector</span>

                <select
                  value={sectorFilter}
                  onChange={(event) =>
                    setSectorFilter(event.target.value)
                  }
                >
                  <option value="todas">Todos</option>

                  {filterOptions.sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </label>

              <label className="institution-filter-field">
                <span>Departamento</span>

                <select
                  value={departamentoFilter}
                  onChange={(event) => {
                    const value = event.target.value
                    setDepartamentoFilter(value)
                    setLocalidadFilter("todas")
                  }}
                >
                  <option value="todos">Todos</option>

                  {filterOptions.departamentos.map(
                    (departamento) => (
                      <option
                        key={departamento}
                        value={departamento}
                      >
                        {departamento}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="institution-filter-field">
                <span>Localidad</span>

                <select
                  value={localidadFilter}
                  onChange={(event) =>
                    setLocalidadFilter(
                      event.target.value,
                    )
                  }
                >
                  <option value="todas">Todas</option>

                  {filterOptions.localidades
                    .filter(
                      (localidad) =>
                        departamentoFilter === "todos" ||
                        institutionsForView.some(
                          (institution) =>
                            institution.departamento ===
                              departamentoFilter &&
                            institution.localidad ===
                              localidad,
                        ),
                    )
                    .map((localidad) => (
                      <option
                        key={localidad}
                        value={localidad}
                      >
                        {localidad}
                      </option>
                    ))}
                </select>
              </label>

              <label className="institution-filter-field">
                <span>Ámbito</span>

                <select
                  value={ambitoFilter}
                  onChange={(event) =>
                    setAmbitoFilter(event.target.value)
                  }
                >
                  <option value="todos">Todos</option>

                  {filterOptions.ambitos.map((ambito) => (
                    <option key={ambito} value={ambito}>
                      {ambito}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="institution-filter-group">
            <div
              className="institution-filter-options"
              role="group"
              aria-label="Filtrar por criticidad"
            >
              {criticalityFilters.map((filter) => {
                const isActive =
                  criticalityFilter === filter.value

                return (
                  <button
                    key={filter.value}
                    type="button"
                    className={`institution-filter-chip ${
                      isActive ? "is-active" : ""
                    }`}
                    aria-pressed={isActive}
                    onClick={() => {
                      setCriticalityFilter(
                        criticalityFilter === filter.value
                          ? "todas"
                          : filter.value,
                      )
                    }}
                  >
                    {filter.value !== "todas" && (
                      <span
                        className={`institution-filter-dot ${filter.value}`}
                        aria-hidden="true"
                      />
                    )}

                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="institution-search-toolbar">
            <p
              className="institution-search-results"
              aria-live="polite"
            >
              {hasAnyFilters
                ? `${filteredAssessments.length} ${
                    filteredAssessments.length === 1
                      ? "institución encontrada"
                      : "instituciones encontradas"
                  }`
                : `${assessments.length} instituciones`}
            </p>

            {hasAnyFilters && (
              <button
                type="button"
                className="secondary-button"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {hasAnyFilters &&
            filteredAssessments.length === 0 && (
              <div className="institution-empty-state">
                <p>
                  No encontramos instituciones con estos
                  criterios.
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
        </div>
      </section>

      <section
        className="institution-card-grid"
        aria-label="Instituciones del Circuito 3"
      >
        {filteredAssessments.map(
          ({
            institution,
            assessment,
            institutionEvaluations,
          }) => {
            const isExpanded =
              expandedId === institution.id

            const lastEvaluation =
              institutionEvaluations[0]

            const mapsUrl = googleMapsUrl(
              institution.latitude,
              institution.longitude,
            )

            const institutionIncidences =
              incidences
                .filter(
                  (incidence) =>
                    incidence.institutionId === institution.id,
                )
                .sort((a, b) => {
                  if (a.status !== b.status) {
                    return a.status === "open" ? -1 : 1
                  }

                  if (a.status === "open") {
                    const urgencyA =
                      a.currentUrgency
                        ? urgencyWeight[a.currentUrgency]
                        : 0
                    const urgencyB =
                      b.currentUrgency
                        ? urgencyWeight[b.currentUrgency]
                        : 0

                    if (urgencyA !== urgencyB) {
                      return urgencyB - urgencyA
                    }
                  }

                  return (
                    new Date(b.resolvedAt ?? b.createdAt).getTime() -
                    new Date(a.resolvedAt ?? a.createdAt).getTime()
                  )
                })

            return (
              <article
                className={`institution-card-wrap ${
                  isExpanded ? "is-expanded" : ""
                }`}
                key={institution.id}
              >
                <article
                  className={`institution-card criticality-${assessment.criticality}`}
                >
                  <div className="institution-card-top">
                    <span
                      className={`criticality-badge ${assessment.criticality}`}
                    >
                      {criticalityLabel(
                        assessment.criticality,
                      )}
                    </span>

                    {assessment.evaluationCount > 0 && (
                      <span className="institution-evaluation-count">
                        {assessment.evaluationCount}{" "}
                        relevamiento
                        {assessment.evaluationCount === 1
                          ? ""
                          : "s"}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="institution-name-button"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedId(
                        isExpanded
                          ? null
                          : institution.id,
                      )
                    }
                  >
                    {institution.name}
                  </button>

                  <p>
                    {institution.address} ·{" "}
                    {institution.sector}
                  </p>

                  {(institution.departamento ||
                    institution.localidad) && (
                    <p className="institution-territory">
                      {institution.departamento ||
                        "Departamento no disponible"}
                      {" · "}
                      {institution.localidad ||
                        "Localidad no disponible"}
                    </p>
                  )}

                  <div className="institution-meta">
                    <span>
                      CUE:{" "}
                      {institution.cue ||
                        "No disponible"}
                    </span>

                    <span>
                      {institution.levels
                        .map((level) => level.level)
                        .join(" · ")}
                    </span>
                  </div>

                  <div className="institution-card-footer">
                    <small>
                      {assessment.lastDate
                        ? `Hace ${daysSince(
                            assessment.lastDate,
                          )} ${
                            daysSince(
                              assessment.lastDate,
                            ) === 1
                              ? "día"
                              : "días"
                          }`
                        : "Nunca relevada"}
                    </small>

                    <Link
                      className={
                        assessment.evaluationCount > 0
                          ? "secondary-button institution-action"
                          : "primary-button institution-action"
                      }
                      href={`/relevamientos/nuevo?institution=${encodeURIComponent(
                        institution.id,
                      )}`}
                    >
                      {assessment.evaluationCount > 0
                        ? "Actualizar situación"
                        : "Iniciar relevamiento"}
                    </Link>
                  </div>
                </article>

                {isExpanded && (
                  <section
                    className="institution-context"
                    aria-label={`Detalle de ${institution.name}`}
                  >
                    <div className="context-header">
                      <div>
                        <p className="eyebrow">
                          DETALLE INSTITUCIONAL
                        </p>

                        <h2>{institution.name}</h2>
                      </div>

                      <button
                        type="button"
                        className="context-close"
                        onClick={() =>
                          setExpandedId(null)
                        }
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="context-info-grid">
                      <div>
                        <span>CUE</span>
                        <strong>
                          {institution.cue ||
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Sector</span>
                        <strong>
                          {institution.sector ||
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Domicilio</span>
                        <strong>
                          {institution.address ||
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Localidad</span>
                        <strong>
                          {institution.localidad ||
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Departamento</span>
                        <strong>
                          {institution.departamento ||
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Ámbito</span>
                        <strong>
                          {institution.ambito ||
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <span>Relevamientos</span>
                        <strong>
                          {institutionEvaluations.length}
                        </strong>
                      </div>

                      <div>
                        <span>Último relevamiento</span>
                        <strong>
                          {assessment.lastDate
                            ? `Hace ${daysSince(
                                assessment.lastDate,
                              )} ${
                                daysSince(
                                  assessment.lastDate,
                                ) === 1
                                  ? "día"
                                  : "días"
                              }`
                            : "Nunca relevada"}
                        </strong>
                      </div>

                      <div>
                        <span>Último estado</span>
                        <strong>
                          {lastEvaluation
                            ? lastEvaluation.status ===
                              "closed"
                              ? "Cerrado"
                              : "En curso"
                            : "Sin relevamiento"}
                        </strong>
                      </div>
                    </div>

                    <div className="context-block">
                      <div className="context-block-heading">
                        <h3>Ubicación y contacto</h3>
                      </div>

                      <div className="context-info-grid">
                        <div>
                          <span>Teléfonos</span>

                          <strong>
                            {institution.telefono.length >
                            0
                              ? institution.telefono.join(
                                  " · ",
                                )
                              : "No disponible"}
                          </strong>
                        </div>

                        <div>
                          <span>Emails</span>

                          <strong>
                            {institution.email.length > 0
                              ? institution.email.join(
                                  " · ",
                                )
                              : "No disponible"}
                          </strong>
                        </div>

                        {mapsUrl && (
                          <div>
                            <span>Ubicación</span>

                            <strong>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Cómo llegar
                              </a>
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="context-block">
                      <div className="context-block-heading">
                        <h3>Autoridades</h3>
                      </div>

                      <div className="context-info-grid">
                        <div>
                          <span>Directivo/a vigente</span>

                          <strong>
                            {institution.directivo
                              ?.nombre ||
                              "No disponible"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="context-block">
                      <div className="context-block-heading">
                        <h3>Oferta educativa</h3>
                      </div>

                      <div className="levels-list">
                        {institution.levels.map((level) => (
                          <div key={level.id}>
                            <strong>{level.level}</strong>

                            {level.modalidad && (
                              <span>
                                Modalidad:{" "}
                                {level.modalidad}
                              </span>
                            )}

                            {level.empresa && (
                              <span>
                                Empresa: {level.empresa}
                              </span>
                            )}

                            {level.level === "Secundario" &&
                              level.studyPlans &&
                              level.studyPlans.length > 0 && (
                                <div className="educational-offer-plans">
                                  <span className="educational-offer-label">
                                    Planes de estudio
                                  </span>

                                  <ul>
                                    {level.studyPlans.map(
                                      (plan) => (
                                        <li key={plan.id}>
                                          {plan.nombre}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="context-block">
                      <div className="context-block-heading">
                        <h3>Incidencias</h3>
                        <span className="context-incidence-count">
                          {institutionIncidences.length}{" "}
                          {institutionIncidences.length === 1
                            ? "incidencia"
                            : "incidencias"}
                        </span>
                      </div>

                      {institutionIncidences.length === 0 ? (
                        <p className="muted">
                          No hay incidencias registradas para la institución.
                        </p>
                      ) : (
                        <div className="institution-incidences">
                          {institutionIncidences.map((incidence) => {
                            const isResolved =
                              incidence.status === "resolved"
                            const incidenceCriticality =
                              incidence.currentUrgency
                                ? criticalityFromScore(
                                    urgencyWeight[incidence.currentUrgency],
                                  )
                                : "sin-relevamiento"

                            return (
                              <article
                                className={`institution-incidence ${
                                  isResolved ? "is-resolved" : ""
                                }`}
                                key={incidence.id}
                              >
                                <div className="institution-incidence-main">
                                  <div className="institution-incidence-heading">
                                    <div>
                                      <span className="institution-incidence-dimension">
                                        {incidence.dimensionName}
                                      </span>
                                      <strong>
                                        {incidence.indicatorName}
                                      </strong>
                                    </div>

                                    <span
                                      className={`institution-incidence-status ${
                                        isResolved
                                          ? "resolved"
                                          : incidenceCriticality
                                      }`}
                                    >
                                      {isResolved
                                        ? "Resuelto"
                                        : criticalityLabel(
                                            incidenceCriticality,
                                          )}
                                    </span>
                                  </div>

                                  <div className="institution-incidence-meta">
                                    <span>
                                      <strong>Detalle:</strong>{" "}
                                      {incidence.observation ||
                                        "Sin detalle registrado."}
                                    </span>

                                    <span>
                                      {isResolved
                                        ? <>
                                            <strong>
                                              Fecha de resolución:
                                            </strong>{" "}
                                            {formatDate(
                                              incidence.resolvedAt ??
                                                incidence.createdAt,
                                            )}
                                          </>
                                        : <>
                                            <strong>Registrada:</strong>{" "}
                                            {formatDate(incidence.createdAt)}
                                            {" · "}
                                            {incidence.currentUrgency
                                              ? `Urgencia: ${urgencyLabel(
                                                  incidence.currentUrgency,
                                                )}`
                                              : "Sin urgencia registrada"}
                                          </>}
                                    </span>

                                    {isResolved && (
                                      <span>
                                        <strong>
                                          Cómo se solucionó:
                                        </strong>{" "}
                                        {incidence.resolutionDescription?.trim() ||
                                          "Sin descripción de resolución."}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="context-block">
                      <div className="context-block-heading">
                        <h3>Evolución de incidencias</h3>
                        <span className="context-incidence-count">
                          {institutionIncidences.length}{" "}
                          {institutionIncidences.length === 1
                            ? "incidencia"
                            : "incidencias"}
                        </span>
                      </div>

                      {institutionIncidences.length === 0 ? (
                        <p className="muted">
                          No hay incidencias para mostrar en la evolución.
                        </p>
                      ) : (
                        <div className="evolution-table-wrap">
                          <table className="evolution-table">
                            <thead>
                              <tr>
                                <th>Indicador</th>
                                <th>Origen</th>
                                <th>Resolución</th>
                                <th>Estado</th>
                              </tr>
                            </thead>

                            <tbody>
                              {institutionIncidences.map((incidence) => {
                                const isResolved =
                                  incidence.status === "resolved"

                                return (
                                  <tr key={incidence.id}>
                                    <td>
                                      <strong>
                                        {incidence.indicatorName}
                                      </strong>
                                      <small>
                                        {incidence.dimensionName}
                                      </small>
                                    </td>

                                    <td>
                                      {formatDate(incidence.createdAt)}
                                    </td>

                                    <td>
                                      {isResolved
                                        ? formatDate(
                                            incidence.resolvedAt ??
                                              incidence.createdAt,
                                          )
                                        : "Pendiente"}
                                    </td>

                                    <td>
                                      <span
                                        className={`status-text ${
                                          isResolved
                                            ? "resolved"
                                            : incidence.currentUrgency
                                              ? criticalityFromScore(
                                                  urgencyWeight[
                                                    incidence.currentUrgency
                                                  ],
                                                )
                                              : "sin-relevamiento"
                                        }`}
                                      >
                                        {isResolved
                                          ? "Resuelto"
                                          : incidence.currentUrgency
                                            ? criticalityLabel(
                                                criticalityFromScore(
                                                  urgencyWeight[
                                                    incidence.currentUrgency
                                                  ],
                                                ),
                                              )
                                            : "Sin urgencia"}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="context-block">
                      <h3>
                        Historial de relevamientos
                      </h3>

                      {institutionEvaluations.length ===
                      0 ? (
                        <p className="muted">
                          No hay relevamientos registrados.
                        </p>
                      ) : (
                        <div className="evaluation-history">
                          {institutionEvaluations.map(
                            (evaluation) => (
                              <div
                                className="evaluation-history-row"
                                key={evaluation.id}
                              >
                                <div>
                                  <strong>
                                    {formatDate(
                                      evaluation.date,
                                    )}
                                  </strong>

                                  <span>
                                    {evaluation.institutionLevelId
                                      ? institution.levels.find(
                                          (level) =>
                                            level.id ===
                                            evaluation.institutionLevelId,
                                        )?.level ??
                                        "Nivel no encontrado"
                                      : "Toda la institución"}
                                  </span>
                                </div>

                                <div>
                                  <span>
                                    v
                                    {
                                      evaluation.version
                                    }
                                  </span>

                                  <span
                                    className={`history-status ${evaluation.status}`}
                                  >
                                    {evaluation.status ===
                                    "closed"
                                      ? "Cerrado"
                                      : "En curso"}
                                  </span>
                                </div>

                                <Link
                                  className="secondary-button"
                                  href={`/relevamientos/nuevo?evaluation=${encodeURIComponent(
                                    evaluation.id,
                                  )}`}
                                >
                                  {evaluation.status ===
                                  "closed"
                                    ? "Consultar"
                                    : "Continuar"}
                                </Link>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </article>
            )
          },
        )}
      </section>
    </main>
  )
}
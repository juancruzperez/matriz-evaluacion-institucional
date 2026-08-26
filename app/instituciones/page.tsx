"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { dimensions } from "@/lib/evaluation-template"
import {
  calculateInstitutionAssessment,
  URGENCY_WEIGHT,
  type Criticality,
} from "@/lib/criticality"
import { getEvaluationResponse } from "@/lib/evaluation-responses"
import type { Evaluation, Urgency } from "@/types/evaluation"
import type { Institution } from "@/types/institution"

const criticalityOrder: Record<Criticality, number> = {
  alta: 0,
  media: 1,
  baja: 2,
  "sin-relevamiento": 3,
}

const urgencyWeight: Record<Urgency, number> =
  URGENCY_WEIGHT

function criticalityLabel(value: Criticality) {
  if (value === "sin-relevamiento") {
    return "Sin relevamiento"
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function parseDate(date: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date
      .split("-")
      .map(Number)

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
    (startOfToday.getTime() - lastDay.getTime()) /
      86400000,
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

function criticalityFromScore(
  score: number | null,
): Criticality {
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

function dimensionAssessment(evaluation: Evaluation, dimensionId: string) {
  const dimension = dimensions.find((item) => item.id === dimensionId)
  if (!dimension) return null

  const values = dimension.indicators
    .map((indicator) => getEvaluationResponse(evaluation.responses, indicator.id)?.urgency)
    .filter((urgency): urgency is Urgency => Boolean(urgency))
    .map((urgency) => urgencyWeight[urgency])

  const score = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  return {
    score,
    criticality: criticalityFromScore(score),
  }
}

function dimensionEntries(evaluation: Evaluation, dimensionId: string) {
  const dimension = dimensions.find((item) => item.id === dimensionId)
  if (!dimension) return []

  return dimension.indicators.flatMap((indicator) => {
    const response = getEvaluationResponse(evaluation.responses, indicator.id)
    if (!response) return []
    const fields = Object.entries(response.fields ?? {})
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .filter((value) => !value.endsWith(": "))

    const entries: string[] = []
    if (response.observation.trim()) entries.push(response.observation.trim())
    if (response.strengths?.trim()) entries.push(`Fortaleza: ${response.strengths.trim()}`)
    if (fields.length) entries.push(fields.join(" · "))
    if (response.urgency) entries.push(`Urgencia: ${urgencyLabel(response.urgency)}`)

    return entries.length ? [{ indicator: indicator.title, entries }] : []
  })
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [institutionsLoading, setInstitutionsLoading] = useState(true)
  const [institutionsError, setInstitutionsError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [criticalityFilter, setCriticalityFilter] =
    useState<Criticality | "todas">("todas")

  useEffect(() => {
  const loadData = async () => {
    try {
      setInstitutionsLoading(true)
      setInstitutionsError(null)

      const [
        institutionsResponse,
        evaluationsResponse,
      ] = await Promise.all([
        fetch("/api/institutions"),
        fetch("/api/evaluations"),
      ])

      if (!institutionsResponse.ok) {
        throw new Error(
          "No se pudieron cargar las instituciones",
        )
      }

      if (!evaluationsResponse.ok) {
        throw new Error(
          "No se pudieron cargar los relevamientos",
        )
      }

      const [
        institutionsData,
        evaluationsData,
      ] = await Promise.all([
        institutionsResponse.json() as Promise<Institution[]>,
        evaluationsResponse.json() as Promise<Evaluation[]>,
      ])

      setInstitutions(institutionsData)

      setEvaluations(
        evaluationsData.map((evaluation) => ({
          ...evaluation,
          status:
            evaluation.status ?? "draft",
        })),
      )
    } catch (error) {
      console.error(error)

      setInstitutionsError(
        "No se pudieron cargar los datos institucionales.",
      )
    } finally {
      setInstitutionsLoading(false)
    }
  }

  loadData()
}, [])

  const assessments = useMemo(() => {
    return institutions
      .map((institution) => ({
        institution,
        assessment: calculateInstitutionAssessment(institution.id, evaluations),
        institutionEvaluations: evaluations
          .filter((evaluation) => evaluation.institutionId === institution.id)
          .sort((a, b) => b.date.localeCompare(a.date) || b.version - a.version),
      }))
      .sort((a, b) => {
        const categoryDifference = criticalityOrder[a.assessment.criticality] - criticalityOrder[b.assessment.criticality]
        if (categoryDifference !== 0) return categoryDifference
        return (b.assessment.score ?? -1) - (a.assessment.score ?? -1)
      })
  }, [evaluations, institutions])
  
  const normalizeSearchText = (value: string) =>
  value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()

const filteredAssessments = useMemo(() => {
  const query = normalizeSearchText(searchQuery.trim())

  return assessments.filter(({ institution, assessment }) => {
    const matchesSearch =
      !query ||
      normalizeSearchText(
        [
          institution.name,
          institution.cue,
          institution.address,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query)

    const matchesCriticality =
      criticalityFilter === "todas" ||
      assessment.criticality === criticalityFilter

    return matchesSearch && matchesCriticality
  })
}, [assessments, searchQuery, criticalityFilter])
  
const counts = useMemo(() => {
    return assessments.reduce(
      (acc, item) => {
        acc[item.assessment.criticality] += 1
        return acc
      },
      { alta: 0, media: 0, baja: 0, "sin-relevamiento": 0 } as Record<Criticality, number>,
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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="back-link" href="/">← Dashboard</Link>
          <p className="eyebrow">CIRCUITO 3</p>
          <h1>Instituciones</h1>
          <p className="muted">Instituciones del circuito ordenadas por criticidad.</p>
        </div>
        <Link className="primary-button" href="/relevamientos/nuevo">Nuevo relevamiento</Link>
      </header>

      <section className="institution-summary-bar">
        {institutionsLoading && (
          <p className="muted">Cargando instituciones...</p>
        )}

        {institutionsError && (
          <p className="muted">{institutionsError}</p>
        )}
        <div><strong>{institutions.length}</strong><span>Instituciones</span></div>
        <div><strong>{counts.alta}</strong><span>Criticidad alta</span></div>
        <div><strong>{counts.media}</strong><span>Criticidad media</span></div>
        <div><strong>{counts.baja}</strong><span>Criticidad baja</span></div>
        <div><strong>{counts["sin-relevamiento"]}</strong><span>Sin relevamiento</span></div>
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
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Nombre, CUE o domicilio..."
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
          aria-label="Filtrar por criticidad"
        >
          {criticalityFilters.map((filter) => {
            const isActive = criticalityFilter === filter.value

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

    <p
      className="institution-search-results"
      aria-live="polite"
    >
      {searchQuery.trim() || criticalityFilter !== "todas"
        ? `${filteredAssessments.length} ${
            filteredAssessments.length === 1
              ? "institución encontrada"
              : "instituciones encontradas"
          }`
        : `${assessments.length} instituciones`}
    </p>

    {(searchQuery.trim() || criticalityFilter !== "todas") &&
      filteredAssessments.length === 0 && (
        <div className="institution-empty-state">
          <p>
            No encontramos instituciones con estos filtros.
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSearchQuery("")
              setCriticalityFilter("todas")
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}
  </div>
</section>
      <section className="institution-card-grid" aria-label="Instituciones del Circuito 3">
        {filteredAssessments.map(({ institution, assessment, institutionEvaluations }) => {
          const isExpanded = expandedId === institution.id
          const lastEvaluation = institutionEvaluations[0]

          return (
            <article className={`institution-card-wrap ${isExpanded ? "is-expanded" : ""}`} key={institution.id}>
              <article className={`institution-card criticality-${assessment.criticality}`}>
                <div className="institution-card-top">
                  <span className={`criticality-badge ${assessment.criticality}`}>
                    {criticalityLabel(assessment.criticality)}
                  </span>
                  {assessment.evaluationCount > 0 && <span className="institution-evaluation-count">{assessment.evaluationCount} relevamiento{assessment.evaluationCount === 1 ? "" : "s"}</span>}
                </div>
                <button
                  type="button"
                  className="institution-name-button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : institution.id)}
                >
                  {institution.name}
                </button>
                <p>{institution.address} · {institution.sector}</p>
                <div className="institution-meta">
                  <span>CUE: {institution.cue || "No disponible"}</span>
                  <span>{institution.levels.map((level) => level.level).join(" · ")}</span>
                </div>
                <div className="institution-card-footer">
                  <small>{assessment.lastDate ? `Hace ${daysSince(assessment.lastDate)} ${daysSince(assessment.lastDate) === 1 ? "día" : "días"}` : "Nunca relevada"}</small>
                  <Link
                    className={assessment.evaluationCount > 0 ? "secondary-button institution-action" : "primary-button institution-action"}
                    href={`/relevamientos/nuevo?institution=${encodeURIComponent(institution.id)}`}
                  >
                    {assessment.evaluationCount > 0 ? "Actualizar situación" : "Iniciar relevamiento"}
                  </Link>
                </div>
              </article>

              {isExpanded && (
                <section className="institution-context" aria-label={`Detalle de ${institution.name}`}>
                  <div className="context-header">
                    <div>
                      <p className="eyebrow">DETALLE INSTITUCIONAL</p>
                      <h2>{institution.name}</h2>
                    </div>
                    <button type="button" className="context-close" onClick={() => setExpandedId(null)}>Cerrar</button>
                  </div>

                  <div className="context-info-grid">
                    <div><span>CUE</span><strong>{institution.cue || "No disponible"}</strong></div>
                    <div><span>Domicilio</span><strong>{institution.address || "No disponible"}</strong></div>
                    <div><span>Sector</span><strong>{institution.sector || "No disponible"}</strong></div>
                    <div><span>Relevamientos</span><strong>{institutionEvaluations.length}</strong></div>
                    <div><span>Último relevamiento</span><strong>{assessment.lastDate ? `Hace ${daysSince(assessment.lastDate)} ${daysSince(assessment.lastDate) === 1 ? "día" : "días"}` : "Nunca relevada"}</strong></div>
                    <div><span>Último estado</span><strong>{lastEvaluation ? (lastEvaluation.status === "closed" ? "Cerrado" : "En curso") : "Sin relevamiento"}</strong></div>
                  </div>

                  <div className="context-block">
                    <div className="context-block-heading">
                      <h3>Situación actual</h3>
                      <span className={`criticality-badge ${assessment.criticality}`}>{criticalityLabel(assessment.criticality)}</span>
                    </div>
                    <div className="dimension-status-grid">
                      {dimensions.map((dimension) => {
                        const latestForDimension = institutionEvaluations
                          .map((evaluation) => ({ evaluation, assessment: dimensionAssessment(evaluation, dimension.id) }))
                          .find((item) => item.assessment?.score !== null)
                        const current = latestForDimension?.assessment ?? null
                        return (
                          <div className="dimension-status" key={dimension.id}>
                            <span>{dimension.title}</span>
                            <strong className={`status-text ${current?.criticality ?? "sin-relevamiento"}`}>
                              {criticalityLabel(current?.criticality ?? "sin-relevamiento")}
                            </strong>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="context-block">
                    <h3>Información derivada de los relevamientos</h3>
                    {institutionEvaluations.length === 0 ? (
                      <p className="muted">Todavía no hay información derivada.</p>
                    ) : (
                      <div className="derived-grid">
                        {dimensions.map((dimension) => {
                          const entries = institutionEvaluations.flatMap((evaluation) =>
                            dimensionEntries(evaluation, dimension.id).map((entry) => ({ ...entry, date: evaluation.date, version: evaluation.version })),
                          )
                          return (
                            <article className="derived-dimension" key={dimension.id}>
                              <h4>{dimension.title}</h4>
                              {entries.length === 0 ? (
                                <p className="muted">Sin observaciones registradas.</p>
                              ) : (
                                entries.slice(0, 8).map((entry, index) => (
                                  <div className="derived-entry" key={`${entry.date}-${entry.version}-${entry.indicator}-${index}`}>
                                    <strong>{entry.indicator}</strong>
                                    <small>{formatDate(entry.date)} · v{entry.version}</small>
                                    <ul>{entry.entries.map((text, textIndex) => <li key={textIndex}>{text}</li>)}</ul>
                                  </div>
                                ))
                              )}
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="context-block">
                    <h3>Evolución por relevamiento</h3>
                    {institutionEvaluations.length < 2 ? (
                      <p className="muted">Se necesitan al menos dos relevamientos para mostrar evolución.</p>
                    ) : (
                      <div className="evolution-table-wrap">
                        <table className="evolution-table">
                          <thead><tr><th>Dimensión</th><th>{formatDate(institutionEvaluations[1].date)}</th><th>{formatDate(institutionEvaluations[0].date)}</th></tr></thead>
                          <tbody>
                            {dimensions.map((dimension) => {
                              const previous = dimensionAssessment(institutionEvaluations[1], dimension.id)?.criticality ?? "sin-relevamiento"
                              const current = dimensionAssessment(institutionEvaluations[0], dimension.id)?.criticality ?? "sin-relevamiento"
                              return <tr key={dimension.id}><td>{dimension.title}</td><td><span className={`status-text ${previous}`}>{criticalityLabel(previous)}</span></td><td><span className={`status-text ${current}`}>{criticalityLabel(current)}</span></td></tr>
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="context-block">
                    <div className="context-block-heading">
                      <h3>Información institucional</h3>
                    </div>
                    <div className="levels-list">
                      {institution.levels.map((level) => (
                        <div key={`${level.level}-${level.empresa}`}><strong>{level.level}</strong><span>EMPRESA {level.empresa || "No disponible"}</span></div>
                      ))}
                    </div>
                  </div>

                  <div className="context-block">
                    <h3>Historial de relevamientos</h3>
                    {institutionEvaluations.length === 0 ? (
                      <p className="muted">No hay relevamientos registrados.</p>
                    ) : (
                      <div className="evaluation-history">
                        {institutionEvaluations.map((evaluation) => (
                          <div className="evaluation-history-row" key={evaluation.id}>
                            <div><strong>{formatDate(evaluation.date)}</strong>
                              <span>
                                {evaluation.institutionLevelId
                                  ? institution.levels.find(
                                      (level) =>
                                        level.id === evaluation.institutionLevelId,
                                    )?.level ?? "Nivel no encontrado"
                                  : "Toda la institución"}
                              </span></div>
                            <div><span>v{evaluation.version}</span><span className={`history-status ${evaluation.status}`}>{evaluation.status === "closed" ? "Cerrado" : "En curso"}</span></div>
                            <Link
                              className="secondary-button"
                              href={`/relevamientos/nuevo?evaluation=${encodeURIComponent(evaluation.id)}`}
                            >
                              {evaluation.status === "closed" ? "Consultar" : "Continuar"}
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </article>
          )
        })}
      </section>
    </main>
  )
}
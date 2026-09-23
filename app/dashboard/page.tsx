"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"

import { fetcher } from "@/lib/fetcher"
import type { Institution } from "@/types/institution"
import type { Evaluation, Urgency } from "@/types/evaluation"
import {
  calculateInstitutionAssessment,
  type CriticalityIncidence,
} from "@/lib/criticality"

const TerritorialOverview = dynamic(
  () =>
    import("@/components/dashboard/TerritorialOverview").then(
      (module) => module.TerritorialOverview,
    ),
  {
    ssr: false,
    loading: () => (
      <section className="dashboard-card territorial-dashboard-card">
        <p className="muted">
          Cargando situación territorial...
        </p>
      </section>
    ),
  },
)

type SessionUser = {
  roleId?: string
  departamento?: string | null
}

type IncidenceApiResponse = {
  id: string
  institutionId: string
  evaluationId: string
  evaluationResponseId: string
  status: "open" | "resolved"
  createdAt: string
  resolvedAt: string | null

  currentUrgency: Urgency | null

  response?: {
    urgency?: Urgency | null
  } | null
}

type DashboardApiResponse = {
  evaluations: Evaluation[]
  institutions: Institution[]
  incidences: IncidenceApiResponse[]
}

export default function Dashboard() {
  const [sessionUser, setSessionUser] =
    useState<SessionUser | null>(null)

  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: loadingEvaluations,
  } = useSWR<DashboardApiResponse>(
    "/api/dashboard",
    fetcher,
  )

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch(
          "/api/auth/session",
          {
            cache: "no-store",
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            "No se pudo cargar la sesión.",
          )
        }

        setSessionUser(data?.user ?? null)
      } catch (error) {
        console.error(
          "Error al cargar la sesión",
          error,
        )
      }
    }

    void loadSession()
  }, [])

  useEffect(() => {
    if (!dashboardError) return

    console.error(
      "Error al cargar datos del dashboard",
      dashboardError,
    )
  }, [dashboardError])

  const evaluations = useMemo(() => {
    return (
      dashboardData?.evaluations.map(
        (evaluation) => ({
          ...evaluation,
          status:
            evaluation.status ?? "draft",
        }),
      ) ?? []
    )
  }, [dashboardData])

  const institutions = useMemo(() => {
    return dashboardData?.institutions ?? []
  }, [dashboardData])

  const incidences = useMemo<
    CriticalityIncidence[]
  >(() => {
    const incidenceRows =
      Array.isArray(dashboardData?.incidences)
        ? dashboardData.incidences
        : []

    return incidenceRows.map(
      (incidence) => ({
        id: incidence.id,
        institutionId:
          incidence.institutionId,
        evaluationId:
          incidence.evaluationId,
        evaluationResponseId:
          incidence.evaluationResponseId,
        status: incidence.status,
        createdAt: incidence.createdAt,
        resolvedAt:
          incidence.resolvedAt,
        currentUrgency:
          incidence.currentUrgency ??
          null,
      }),
    )
  }, [dashboardData])

  const isTerritorialResponsible =
    sessionUser?.roleId ===
    "responsable_territorial"

  /*
   * Los responsables territoriales reciben las
   * instituciones ya filtradas desde el backend.
   *
   * A partir de ese conjunto construimos también
   * el universo de relevamientos que debe mostrar
   * el dashboard.
   */
  const scopedEvaluations = useMemo(() => {
    if (!isTerritorialResponsible) {
      return evaluations
    }

    const institutionIds = new Set(
      institutions.map(
        (institution) => institution.id,
      ),
    )

    return evaluations.filter(
      (evaluation) =>
        institutionIds.has(
          evaluation.institutionId,
        ),
    )
  }, [
    evaluations,
    institutions,
    isTerritorialResponsible,
  ])

  const scopedIncidences = useMemo(() => {
    if (!isTerritorialResponsible) {
      return incidences
    }

    const institutionIds = new Set(
      institutions.map(
        (institution) => institution.id,
      ),
    )

    return incidences.filter(
      (incidence) =>
        institutionIds.has(
          incidence.institutionId,
        ),
    )
  }, [
    incidences,
    institutions,
    isTerritorialResponsible,
  ])

  const draftEvaluations = useMemo(() => {
    return scopedEvaluations.filter(
      (evaluation) =>
        (evaluation.status ?? "draft") ===
        "draft",
    )
  }, [scopedEvaluations])

  const closedEvaluations = useMemo(() => {
    return scopedEvaluations.filter(
      (evaluation) =>
        evaluation.status === "closed",
    )
  }, [scopedEvaluations])

  /*
   * La situación territorial se calcula sobre las
   * instituciones, los relevamientos y las
   * incidencias actualmente abiertas.
   *
   * La criticidad individual se encuentra
   * centralizada en lib/criticality.ts.
   */
  const assessments = useMemo(() => {
    return institutions.map(
      (institution) =>
        calculateInstitutionAssessment(
          institution.id,
          scopedEvaluations,
          scopedIncidences,
        ),
    )
  }, [
    institutions,
    scopedEvaluations,
    scopedIncidences,
  ])

  /*
   * Total de instituciones que forman parte
   * del territorio visible.
   */
  const institutionCount =
    institutions.length

  /*
   * Instituciones que ya tienen al menos
   * un relevamiento cerrado.
   */
  const evaluatedInstitutionCount =
    useMemo(() => {
      const closedInstitutionIds = new Set(
        closedEvaluations.map(
          (evaluation) =>
            evaluation.institutionId,
        ),
      )

      return institutions.filter(
        (institution) =>
          closedInstitutionIds.has(
            institution.id,
          ),
      ).length
    }, [closedEvaluations, institutions])

  /*
   * Instituciones cuya situación actual
   * es de criticidad alta.
   */
  const highCriticalityCount =
    useMemo(() => {
      return assessments.filter(
        (assessment) =>
          assessment.criticality ===
          "alta",
      ).length
    }, [assessments])

  /*
   * Relevamientos que todavía están abiertos.
   */
  const pendingCount = useMemo(() => {
    return scopedEvaluations.filter(
      (evaluation) =>
        (evaluation.status ?? "draft") ===
        "draft",
    ).length
  }, [scopedEvaluations])

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            zona de accion
          </p>

          <h1>
            Matriz de Inteligencia Territorial
          </h1>

          <p className="muted">
            Situación actual
          </p>
        </div>

        <div className="topbar-actions">
          <Link
            className="secondary-button"
            href="/instituciones"
          >
            Instituciones
          </Link>

          <Link
            className="primary-button"
            href="/relevamientos/nuevo"
          >
            Nuevo relevamiento
          </Link>
        </div>
      </header>

      <section
        className="metric-grid"
        aria-label="Resumen del territorio"
      >
        <div className="metric-card">
          <span>
            Instituciones
          </span>

          <strong>
            {institutionCount}
          </strong>

          <small>
            Instituciones que integran el
            territorio.
          </small>
        </div>

        <div className="metric-card">
          <span>
            Instituciones relevadas
          </span>

          <strong>
            {evaluatedInstitutionCount}
          </strong>

          <small>
            Instituciones con al menos un
            relevamiento cerrado.
          </small>
        </div>

        <div className="metric-card">
          <span>
            Criticidad alta
          </span>

          <strong>
            {highCriticalityCount}
          </strong>

          <small>
            Instituciones con situación
            actual de criticidad alta.
          </small>
        </div>

        <div className="metric-card">
          <span>
            Pendientes
          </span>

          <strong>
            {pendingCount}
          </strong>

          <small>
            Relevamientos todavía abiertos.
          </small>
        </div>
      </section>

      <TerritorialOverview
        institutions={institutions}
        evaluations={evaluations}
        loading={loadingEvaluations}
        isTerritorialResponsible={
          isTerritorialResponsible
        }
        territorialDepartment={
          sessionUser?.departamento ?? null
        }
      />

      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              TRABAJO EN CURSO
            </p>

            <h2>
              Relevamientos guardados
            </h2>
          </div>

          <Link
            className="text-link"
            href="/relevamientos/nuevo"
          >
            Nuevo →
          </Link>
        </div>

        {scopedEvaluations.length === 0 ? (
          <p>
            No hay relevamientos guardados
            todavía.
          </p>
        ) : (
          <div className="saved-groups">
            <div className="saved-group">
              <div className="saved-group-heading">
                <div>
                  <strong>
                    En curso
                  </strong>

                  <span>
                    {draftEvaluations.length}{" "}
                    {draftEvaluations.length === 1
                      ? "relevamiento abierto"
                      : "relevamientos abiertos"}
                  </span>
                </div>
              </div>

              {draftEvaluations.length === 0 ? (
                <p className="saved-group-empty">
                  No hay relevamientos en curso.
                </p>
              ) : (
                <div className="saved-list">
                  {draftEvaluations.map(
                    (evaluation) => {
                      const institution =
                        institutions.find(
                          (item) =>
                            item.id ===
                            evaluation.institutionId,
                        )

                      return (
                        <div
                          className="saved-item"
                          key={evaluation.id}
                        >
                          <div>
                            <strong>
                              {institution?.name ??
                                "Institución no encontrada"}
                            </strong>

                            <span>
                              {evaluation.institutionLevelId
                                ? institution?.levels.find(
                                    (level) =>
                                      level.id ===
                                      evaluation.institutionLevelId,
                                  )?.level ??
                                  "Nivel no encontrado"
                                : "Toda la institución"}{" "}
                              · {evaluation.date} · versión{" "}
                              {evaluation.version} · En curso
                            </span>
                          </div>

                          <Link
                            className="text-link"
                            href={`/relevamientos/nuevo?evaluation=${evaluation.id}`}
                          >
                            Continuar →
                          </Link>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </div>

            <div className="saved-group">
              <div className="saved-group-heading">
                <div>
                  <strong>
                    Finalizados
                  </strong>

                  <span>
                    {closedEvaluations.length}{" "}
                    {closedEvaluations.length === 1
                      ? "relevamiento finalizado"
                      : "relevamientos finalizados"}
                  </span>
                </div>
              </div>

              {closedEvaluations.length === 0 ? (
                <p className="saved-group-empty">
                  No hay relevamientos finalizados.
                </p>
              ) : (
                <div className="saved-list">
                  {closedEvaluations.map(
                    (evaluation) => {
                      const institution =
                        institutions.find(
                          (item) =>
                            item.id ===
                            evaluation.institutionId,
                        )

                      return (
                        <div
                          className="saved-item"
                          key={evaluation.id}
                        >
                          <div>
                            <strong>
                              {institution?.name ??
                                "Institución no encontrada"}
                            </strong>

                            <span>
                              {evaluation.institutionLevelId
                                ? institution?.levels.find(
                                    (level) =>
                                      level.id ===
                                      evaluation.institutionLevelId,
                                  )?.level ??
                                  "Nivel no encontrado"
                                : "Toda la institución"}{" "}
                              · {evaluation.date} · versión{" "}
                              {evaluation.version} · Cerrado
                            </span>
                          </div>

                          <Link
                            className="icon-button"
                            href={`/relevamientos/nuevo?evaluation=${evaluation.id}`}
                            aria-label={`Consultar relevamiento de ${
                              institution?.name ??
                              "institución"
                            }`}
                            title="Consultar relevamiento"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path
                                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <circle
                                cx="12"
                                cy="12"
                                r="2.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              />
                            </svg>
                          </Link>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
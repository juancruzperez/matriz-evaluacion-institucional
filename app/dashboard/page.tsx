"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { Institution } from "@/types/institution"
import type { Evaluation } from "@/types/evaluation"
import { calculateInstitutionAssessment } from "@/lib/criticality"

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

export default function Dashboard() {
  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([])

  const [institutions, setInstitutions] =
    useState<Institution[]>([])

  const [loadingEvaluations, setLoadingEvaluations] =
    useState(true)

    useEffect(() => {
  let cancelled = false

  async function loadEvaluations() {
    try {
      const [
        evaluationsResponse,
        institutionsResponse,
      ] = await Promise.all([
        fetch("/api/evaluations", {
          cache: "no-store",
        }),
        fetch("/api/institutions", {
          cache: "no-store",
        }),
      ])

      const evaluationsData =
        await evaluationsResponse.json()

      const institutionsData =
        await institutionsResponse.json()

      if (!evaluationsResponse.ok) {
        throw new Error(
          evaluationsData?.error ??
            "No se pudieron cargar los relevamientos.",
        )
      }

      if (!institutionsResponse.ok) {
        throw new Error(
          institutionsData?.error ??
            "No se pudieron cargar las instituciones.",
        )
      }

      if (cancelled) return

      setEvaluations(
        (evaluationsData as Evaluation[]).map(
          (evaluation) => ({
            ...evaluation,
            status:
              evaluation.status ??
              "draft",
          }),
        ),
      )

      setInstitutions(
        institutionsData as Institution[],
      )
    } catch (error) {
      if (cancelled) return

      console.error(
        "Error al cargar relevamientos",
        error,
      )
    } finally {
      if (!cancelled) {
        setLoadingEvaluations(false)
      }
    }
  }

  void loadEvaluations()

  const handleFocus = () => {
    void loadEvaluations()
  }

  window.addEventListener(
    "focus",
    handleFocus,
  )

  return () => {
    cancelled = true

    window.removeEventListener(
      "focus",
      handleFocus,
    )
  }
}, [])

  const draftEvaluations = useMemo(() => {
    return evaluations.filter(
      (evaluation) =>
        (evaluation.status ?? "draft") === "draft",
    )
  }, [evaluations])

  const closedEvaluations = useMemo(() => {
    return evaluations.filter(
      (evaluation) =>
        evaluation.status === "closed",
    )
  }, [evaluations])

  /*
   * La situación territorial se calcula sobre las
   * instituciones y los relevamientos actuales
   * provenientes de Neon.
   */
  const assessments = useMemo(() => {
    return institutions.map(
      (institution) =>
        calculateInstitutionAssessment(
          institution.id,
          evaluations,
        ),
    )
  }, [institutions, evaluations])

  /*
   * Total de instituciones que forman parte
   * del Circuito 3.
   */
  const institutionCount =
    institutions.length

  /*
   * Instituciones que ya tienen al menos
   * un relevamiento.
   */
  const evaluatedInstitutionCount =
    useMemo(() => {
      return assessments.filter(
        (assessment) =>
          assessment.evaluationCount > 0,
      ).length
    }, [assessments])

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
    return evaluations.filter(
      (evaluation) =>
        (evaluation.status ??
          "draft") === "draft",
    ).length
  }, [evaluations])

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            CIRCUITO 3
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
        aria-label="Resumen del Circuito 3"
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
            Circuito 3.
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
            relevamiento.
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
  evaluations={evaluations}
  loading={loadingEvaluations}
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

  {evaluations.length === 0 ? (
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

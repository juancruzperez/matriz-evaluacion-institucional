"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { institutions } from "@/data/institutions"
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

  const [loadingEvaluations, setLoadingEvaluations] =
    useState(true)

  const [evaluationsError, setEvaluationsError] =
    useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadEvaluations() {
      try {
        const response = await fetch(
          "/api/evaluations",
          {
            cache: "no-store",
          },
        )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ??
              "No se pudieron cargar los relevamientos.",
          )
        }

        if (cancelled) return

        setEvaluations(
          (data as Evaluation[]).map(
            (evaluation) => ({
              ...evaluation,
              status:
                evaluation.status ??
                "draft",
            }),
          ),
        )

        setEvaluationsError(null)
      } catch (error) {
        if (cancelled) return

        console.error(
          "Error al cargar relevamientos",
          error,
        )

        setEvaluationsError(
          "No se pudieron cargar los relevamientos.",
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
  }, [evaluations])

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
            Matriz de Evaluación Institucional
          </h1>

          <p className="muted">
            Relevamiento territorial para el
            seguimiento institucional.
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

      {evaluationsError && (
        <section className="dashboard-card">
          <p className="muted">
            {evaluationsError}
          </p>
        </section>
      )}

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
          <div className="saved-list">
            {evaluations.map(
              (evaluation) => {
                const institution =
                  institutions.find(
                    (item) =>
                      item.id ===
                      evaluation.institutionId,
                  )

                const closed =
                  evaluation.status ===
                  "closed"

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
                        · {evaluation.date} ·
                        versión{" "}
                        {evaluation.version} ·{" "}
                        {closed
                          ? "Cerrado"
                          : "En curso"}
                      </span>
                    </div>

                    <Link
                      className="text-link"
                      href={`/relevamientos/nuevo?evaluation=${evaluation.id}`}
                    >
                      {closed
                        ? "Consultar →"
                        : "Continuar →"}
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
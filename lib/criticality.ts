import type { Evaluation, Urgency } from "@/types/evaluation"
import type { Institution } from "@/types/institution"

export const URGENCY_WEIGHT: Record<Urgency, number> = {
  alto: 1,
  medio: 0.5,
  bajo: 0.25,
}

export type Criticality =
  | "alta"
  | "media"
  | "baja"
  | "sin-relevamiento"

export type IncidenceStatus =
  | "open"
  | "resolved"

export type CriticalityIncidence = {
  id: string
  institutionId: string
  status: IncidenceStatus
  urgency: Urgency | null
  createdAt: string
  resolvedAt: string | null
  evaluationId: string
  evaluationResponseId: string
}

export type InstitutionAssessment = {
  institutionId: string
  score: number | null
  criticality: Criticality
  evaluationCount: number
  indicatorCount: number
  lastDate: string | null
}

export type TerritorialAssessment = {
  totalInstitutions: number
  evaluatedInstitutions: number
  pendingInstitutions: number
  high: number
  medium: number
  low: number
  score: number | null
  criticality: Criticality
}

export function criticalityFromScore(
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


/**
 * Calcula la criticidad actual de una institución
 * a partir de sus incidencias ABIERTAS.
 *
 * Reglas:
 *
 * - Alta  = 1
 * - Media = 0.5
 * - Baja  = 0.25
 *
 * Solamente las incidencias con estado "open"
 * participan del cálculo.
 *
 * Una incidencia resuelta permanece en el historial,
 * pero deja de afectar la criticidad institucional
 * actual.
 */
export function calculateInstitutionAssessment(
  institutionId: string,
  evaluations: Evaluation[],
  incidences: CriticalityIncidence[],
): InstitutionAssessment {
  const institutionEvaluations =
    evaluations.filter(
      (evaluation) =>
        evaluation.institutionId ===
          institutionId &&
        evaluation.status === "closed",
    )

  const institutionIncidences =
    incidences.filter(
      (incidence) =>
        incidence.institutionId ===
          institutionId &&
        incidence.status === "open" &&
        incidence.urgency !== null,
    )

  const scores =
    institutionIncidences.map(
      (incidence) =>
        URGENCY_WEIGHT[
          incidence.urgency as Urgency
        ],
    )

  if (scores.length === 0) {
    return {
      institutionId,
      score: null,
      criticality: "sin-relevamiento",
      evaluationCount:
        institutionEvaluations.length,
      indicatorCount: 0,
      lastDate:
        institutionEvaluations.length > 0
          ? institutionEvaluations
              .map((item) => item.date)
              .sort()
              .at(-1) ?? null
          : null,
    }
  }

  const score =
    scores.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / scores.length

  return {
    institutionId,
    score,
    criticality:
      criticalityFromScore(score),
    evaluationCount:
      institutionEvaluations.length,
    indicatorCount: scores.length,
    lastDate:
      institutionEvaluations
        .map((item) => item.date)
        .sort()
        .at(-1) ?? null,
  }
}

/**
 * Calcula la criticidad acumulada de un territorio.
 *
 * `institutions` define el territorio:
 * - todas las instituciones -> provincia
 * - instituciones de un departamento -> departamento
 *
 * La criticidad de cada institución se obtiene
 * exclusivamente a partir de sus incidencias abiertas.
 *
 * Las instituciones sin incidencias abiertas no
 * modifican el score territorial.
 *
 * Cada institución con criticidad activa tiene
 * el mismo peso dentro del territorio.
 */
export function calculateTerritorialAssessment(
  institutions: Institution[],
  evaluations: Evaluation[],
  incidences: CriticalityIncidence[],
): TerritorialAssessment {
  const assessments =
    institutions.map(
      (institution) =>
        calculateInstitutionAssessment(
          institution.id,
          evaluations,
          incidences,
        ),
    )

  const evaluated =
    assessments.filter(
      (assessment) =>
        assessment.score !== null &&
        assessment.criticality !==
          "sin-relevamiento",
    )

  const high =
    evaluated.filter(
      (assessment) =>
        assessment.criticality ===
        "alta",
    ).length

  const medium =
    evaluated.filter(
      (assessment) =>
        assessment.criticality ===
        "media",
    ).length

  const low =
    evaluated.filter(
      (assessment) =>
        assessment.criticality ===
        "baja",
    ).length

  const score =
    evaluated.length > 0
      ? evaluated.reduce(
          (sum, assessment) =>
            sum +
            (assessment.score ?? 0),
          0,
        ) / evaluated.length
      : null

  return {
    totalInstitutions:
      institutions.length,
    evaluatedInstitutions:
      evaluated.length,
    pendingInstitutions:
      institutions.length -
      evaluated.length,
    high,
    medium,
    low,
    score,
    criticality:
      criticalityFromScore(score),
  }
}
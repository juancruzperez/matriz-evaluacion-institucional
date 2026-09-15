import type { Evaluation, Urgency } from "@/types/evaluation"
import type { Institution } from "@/types/institution"

export const URGENCY_WEIGHT: Record<Urgency, number> = {
  alto: 1,
  medio: 0.5,
  bajo: 0.25,
}

export type Criticality = "alta" | "media" | "baja" | "sin-relevamiento"

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

export function criticalityFromScore(score: number | null): Criticality {
  if (score === null) return "sin-relevamiento"
  if (score >= 0.75) return "alta"
  if (score >= 0.5) return "media"
  return "baja"
}

function latestByLevel(evaluations: Evaluation[]) {
  const sorted = [...evaluations].sort(
    (a, b) => b.date.localeCompare(a.date) || b.version - a.version,
  )

  const general =
    sorted.find(
      (item) =>
        !item.institutionLevelId ||
        item.institutionLevelId === "Toda la institución",
    ) ?? null

  const levels = new Map<string, Evaluation>()

  for (const evaluation of sorted) {
    if (
      !evaluation.institutionLevelId ||
      evaluation.institutionLevelId === "Toda la institución"
    ) {
      continue
    }
    if (!levels.has(evaluation.institutionLevelId)) {
      levels.set(evaluation.institutionLevelId, evaluation)
    }
  }

  if (levels.size === 0) return general ? [general] : []

  const selected = [...levels.values()]

  if (general) {
    const oldestSpecific = selected.reduce(
      (oldest, item) => (item.date < oldest.date ? item : oldest),
      selected[0],
    )
    if (general.date > oldestSpecific.date) selected.push(general)
  }

  return selected
}

/**
 * Calcula la criticidad actual de una institución.
 * Solo los relevamientos cerrados participan del cálculo.
 */
export function calculateInstitutionAssessment(
  institutionId: string,
  evaluations: Evaluation[],
): InstitutionAssessment {
  const institutionEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.institutionId === institutionId &&
      evaluation.status === "closed",
  )

  const currentEvaluations = latestByLevel(institutionEvaluations)

  const scores = currentEvaluations.flatMap((evaluation) =>
    Object.values(evaluation.responses)
      .map((response) => response.urgency)
      .filter((urgency): urgency is Urgency => Boolean(urgency))
      .map((urgency) => URGENCY_WEIGHT[urgency]),
  )

  if (scores.length === 0) {
    return {
      institutionId,
      score: null,
      criticality: "sin-relevamiento",
      evaluationCount: institutionEvaluations.length,
      indicatorCount: 0,
      lastDate:
        institutionEvaluations.length > 0
          ? institutionEvaluations.map((item) => item.date).sort().at(-1) ?? null
          : null,
    }
  }

  const score =
    scores.reduce((sum, value) => sum + value, 0) / scores.length

  return {
    institutionId,
    score,
    criticality: criticalityFromScore(score),
    evaluationCount: institutionEvaluations.length,
    indicatorCount: scores.length,
    lastDate:
      currentEvaluations.map((item) => item.date).sort().at(-1) ?? null,
  }
}

/**
 * Calcula la criticidad acumulada de un territorio.
 *
 * `institutions` define el territorio:
 * - todas las instituciones -> provincia
 * - instituciones de un departamento -> departamento
 *
 * Solo participan instituciones con relevamiento cerrado.
 * Las instituciones pendientes se contabilizan, pero no diluyen
 * ni modifican el score territorial.
 *
 * Cada institución relevada tiene el mismo peso: primero se obtiene
 * su score individual y luego se promedian esos scores.
 */
export function calculateTerritorialAssessment(
  institutions: Institution[],
  evaluations: Evaluation[],
): TerritorialAssessment {
  const assessments = institutions.map((institution) =>
    calculateInstitutionAssessment(institution.id, evaluations),
  )

  const evaluated = assessments.filter(
    (assessment) =>
      assessment.score !== null &&
      assessment.criticality !== "sin-relevamiento",
  )

  const high = evaluated.filter(
    (assessment) => assessment.criticality === "alta",
  ).length

  const medium = evaluated.filter(
    (assessment) => assessment.criticality === "media",
  ).length

  const low = evaluated.filter(
    (assessment) => assessment.criticality === "baja",
  ).length

  const score =
    evaluated.length > 0
      ? evaluated.reduce(
          (sum, assessment) => sum + (assessment.score ?? 0),
          0,
        ) / evaluated.length
      : null

  return {
    totalInstitutions: institutions.length,
    evaluatedInstitutions: evaluated.length,
    pendingInstitutions: institutions.length - evaluated.length,
    high,
    medium,
    low,
    score,
    criticality: criticalityFromScore(score),
  }
}
import type { Evaluation, Urgency } from "@/types/evaluation"

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

export function calculateInstitutionAssessment(
  institutionId: string,
  evaluations: Evaluation[],
): InstitutionAssessment {
  const institutionEvaluations = evaluations.filter(
    (evaluation) => evaluation.institutionId === institutionId,
  )

  const scores = institutionEvaluations.flatMap((evaluation) =>
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
      lastDate: institutionEvaluations.length
        ? institutionEvaluations.map((item) => item.date).sort().at(-1) ?? null
        : null,
    }
  }

  const score = scores.reduce((sum, value) => sum + value, 0) / scores.length
  const criticality: Criticality =
    score >= 0.75 ? "alta" : score >= 0.5 ? "media" : "baja"

  return {
    institutionId,
    score,
    criticality,
    evaluationCount: institutionEvaluations.length,
    indicatorCount: scores.length,
    lastDate: institutionEvaluations.map((item) => item.date).sort().at(-1) ?? null,
  }
}

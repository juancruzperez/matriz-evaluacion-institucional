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

function latestByLevel(evaluations: Evaluation[]) {
  const sorted = [...evaluations].sort((a, b) => b.date.localeCompare(a.date) || b.version - a.version)
  const general = sorted.find((item) => !item.level || item.level === "Toda la institución") ?? null
  const levels = new Map<string, Evaluation>()

  for (const evaluation of sorted) {
    if (!evaluation.level || evaluation.level === "Toda la institución") continue
    if (!levels.has(evaluation.level)) levels.set(evaluation.level, evaluation)
  }

  // A general evaluation is the fallback for levels without a specific current evaluation.
  if (levels.size === 0) return general ? [general] : []
  const selected = [...levels.values()]
  if (general) {
    // Keep the general assessment only as a fallback for levels not yet specifically evaluated.
    // We cannot infer missing levels here, so use the general assessment only when it is newer
    // than the oldest level-specific evaluation.
    const oldestSpecific = selected.reduce((oldest, item) => item.date < oldest.date ? item : oldest, selected[0])
    if (general.date > oldestSpecific.date) selected.push(general)
  }
  return selected
}

export function calculateInstitutionAssessment(institutionId: string, evaluations: Evaluation[]): InstitutionAssessment {
  const institutionEvaluations = evaluations.filter((evaluation) => evaluation.institutionId === institutionId)
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
      lastDate: institutionEvaluations.length ? institutionEvaluations.map((item) => item.date).sort().at(-1) ?? null : null,
    }
  }

  const score = scores.reduce((sum, value) => sum + value, 0) / scores.length
  const criticality: Criticality = score >= 0.75 ? "alta" : score >= 0.5 ? "media" : "baja"
  return {
    institutionId,
    score,
    criticality,
    evaluationCount: institutionEvaluations.length,
    indicatorCount: scores.length,
    lastDate: currentEvaluations.map((item) => item.date).sort().at(-1) ?? null,
  }
}

import {
  getInstitutions,
  type InstitutionScope,
} from "@/lib/data/institutions"
import {
  getEvaluations,
  type EvaluationScope,
} from "@/lib/data/evaluations"
import {
  getIncidences,
  type IncidenceStatusFilter,
  type IncidenceScope,
} from "@/lib/data/incidences"

export type DashboardScope = {
  roleId?: string | null
  departamento?: string | null
}

export type DashboardData = {
  institutions: Awaited<
    ReturnType<typeof getInstitutions>
  >
  evaluations: Awaited<
    ReturnType<typeof getEvaluations>
  >
  incidences: Awaited<
    ReturnType<typeof getIncidences>
  >
}

export async function getDashboardData(
  scope: DashboardScope = {},
): Promise<DashboardData> {
  const institutionScope: InstitutionScope = {
    roleId: scope.roleId,
    departamento: scope.departamento,
  }

  const evaluationScope: EvaluationScope = {
    roleId: scope.roleId,
    departamento: scope.departamento,
  }

  const incidenceScope: IncidenceScope = {
    roleId: scope.roleId,
    departamento: scope.departamento,
  }

  const incidenceStatus: IncidenceStatusFilter =
    "all"

  const [
    institutions,
    evaluations,
    incidences,
  ] = await Promise.all([
    getInstitutions(institutionScope),
    getEvaluations(evaluationScope),
    getIncidences(
      incidenceScope,
      incidenceStatus,
    ),
  ])

  return {
    institutions,
    evaluations,
    incidences,
  }
}
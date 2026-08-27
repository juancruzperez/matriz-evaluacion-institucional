"use client"

import Link from "next/link"
import { useMemo } from "react"
import type { Institution } from "@/types/institution"
import {
  calculateInstitutionAssessment,
  type Criticality,
} from "@/lib/criticality"
import type { Evaluation } from "@/types/evaluation"
import { CriticalityDonut } from "./CriticalityDonut"
import { TerritorialMap } from "./TerritorialMap"

type TerritorialOverviewProps = {
  institutions: Institution[]
  evaluations: Evaluation[]
  loading?: boolean
}

export function TerritorialOverview({
  institutions,
  evaluations,
  loading = false,
}: TerritorialOverviewProps) {
  const assessments = useMemo(
    () =>
      institutions.map(
        (institution) =>
          calculateInstitutionAssessment(
            institution.id,
            evaluations,
          ),
      ),
    [institutions, evaluations],
  )

  const counts = useMemo(
    () =>
      assessments.reduce(
        (acc, item) => {
          acc[item.criticality] += 1

          return acc
        },
        {
          alta: 0,
          media: 0,
          baja: 0,
          "sin-relevamiento": 0,
        } as Record<
          Criticality,
          number
        >,
      ),
    [assessments],
  )

  if (loading) {
    return (
      <section className="dashboard-card territorial-dashboard-card">
        <p className="muted">
          Cargando situación territorial...
        </p>
      </section>
    )
  }

  return (
    <>
      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              SITUACIÓN DEL CIRCUITO
            </p>

            <h2>
              Distribución de instituciones
            </h2>
          </div>

          <Link
            className="text-link"
            href="/instituciones"
          >
            Ver instituciones →
          </Link>
        </div>

        <CriticalityDonut
          counts={counts}
        />
      </section>

      <section className="dashboard-card territorial-dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              CIRCUITO 3
            </p>

            <h2>
              Mapa territorial
            </h2>
          </div>

          <span className="muted">
            Situación actual
          </span>
        </div>

        <TerritorialMap
          institutions={institutions}
          evaluations={evaluations}
        />

        <p className="map-note">
          Cada punto representa una
          institución. El color corresponde a
          su criticidad actual.
        </p>
      </section>
    </>
  )
}
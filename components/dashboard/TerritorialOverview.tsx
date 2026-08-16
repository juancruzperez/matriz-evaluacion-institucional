"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { institutions } from "@/data/institutions"
import { calculateInstitutionAssessment, type Criticality } from "@/lib/criticality"
import type { Evaluation } from "@/types/evaluation"
import { CriticalityDonut } from "./CriticalityDonut"
import { TerritorialMap } from "./TerritorialMap"

const STORAGE_KEY = "mei:evaluations"

function readEvaluations(): Evaluation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Evaluation[]
    return parsed.map((evaluation) => ({ ...evaluation, status: evaluation.status ?? "draft" }))
  } catch {
    return []
  }
}

export function TerritorialOverview() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])

  useEffect(() => {
    const refresh = () => setEvaluations(readEvaluations())
    refresh()
    window.addEventListener("focus", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const assessments = useMemo(
    () => institutions.map((institution) => calculateInstitutionAssessment(institution.id, evaluations)),
    [evaluations],
  )

  const counts = useMemo(() => assessments.reduce((acc, item) => {
    acc[item.criticality] += 1
    return acc
  }, { alta: 0, media: 0, baja: 0, "sin-relevamiento": 0 } as Record<Criticality, number>), [assessments])

  return (
    <>
      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SITUACIÓN DEL CIRCUITO</p>
            <h2>Distribución de instituciones</h2>
          </div>
          <Link className="text-link" href="/instituciones">Ver instituciones →</Link>
        </div>
        <CriticalityDonut counts={counts} />
      </section>

      <section className="dashboard-card territorial-dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CIRCUITO 3</p>
            <h2>Mapa territorial</h2>
          </div>
          <span className="muted">Situación actual</span>
        </div>
        <TerritorialMap evaluations={evaluations} />
        <p className="map-note">Cada punto representa una institución. El color corresponde a su criticidad actual.</p>
      </section>
    </>
  )
}

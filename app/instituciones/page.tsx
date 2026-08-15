"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { institutions } from "@/data/institutions"
import { calculateInstitutionAssessment, type Criticality } from "@/lib/criticality"
import type { Evaluation } from "@/types/evaluation"

const STORAGE_KEY = "mei:evaluations"

const criticalityOrder: Record<Criticality, number> = {
  alta: 0,
  media: 1,
  baja: 2,
  "sin-relevamiento": 3,
}

function readEvaluations(): Evaluation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Evaluation[]
    return parsed.map((evaluation) => ({ ...evaluation, status: evaluation.status ?? "draft" }))
  } catch {
    return []
  }
}

function criticalityLabel(value: Criticality) {
  if (value === "sin-relevamiento") return "Sin relevamiento"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function daysSince(date: string | null) {
  if (!date) return null
  const last = new Date(`${date}T00:00:00`)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.floor((startOfToday.getTime() - last.getTime()) / 86400000)
  return Math.max(0, diff)
}

export default function InstitutionsPage() {
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

  const assessments = useMemo(() => {
    return institutions
      .map((institution) => ({
        institution,
        assessment: calculateInstitutionAssessment(institution.id, evaluations),
      }))
      .sort((a, b) => {
        const categoryDifference = criticalityOrder[a.assessment.criticality] - criticalityOrder[b.assessment.criticality]
        if (categoryDifference !== 0) return categoryDifference
        return (b.assessment.score ?? -1) - (a.assessment.score ?? -1)
      })
  }, [evaluations])

  const counts = useMemo(() => {
    return assessments.reduce(
      (acc, item) => {
        acc[item.assessment.criticality] += 1
        return acc
      },
      { alta: 0, media: 0, baja: 0, "sin-relevamiento": 0 } as Record<Criticality, number>,
    )
  }, [assessments])

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="back-link" href="/">← Dashboard</Link>
          <p className="eyebrow">CIRCUITO 3</p>
          <h1>Instituciones</h1>
          <p className="muted">Instituciones del circuito ordenadas por criticidad.</p>
        </div>
        <Link className="primary-button" href="/relevamientos/nuevo">Nuevo relevamiento</Link>
      </header>

      <section className="institution-summary-bar">
        <div><strong>{institutions.length}</strong><span>Instituciones</span></div>
        <div><strong>{counts.alta}</strong><span>Criticidad alta</span></div>
        <div><strong>{counts.media}</strong><span>Criticidad media</span></div>
        <div><strong>{counts.baja}</strong><span>Criticidad baja</span></div>
        <div><strong>{counts["sin-relevamiento"]}</strong><span>Sin relevamiento</span></div>
      </section>

      <section className="institution-card-grid" aria-label="Instituciones del Circuito 3">
        {assessments.map(({ institution, assessment }) => (
          <article className={`institution-card criticality-${assessment.criticality}`} key={institution.id}>
            <div className="institution-card-top">
              <span className={`criticality-badge ${assessment.criticality}`}>
                {criticalityLabel(assessment.criticality)}
              </span>
              {assessment.evaluationCount > 0 && <span className="institution-evaluation-count">{assessment.evaluationCount} relevamiento{assessment.evaluationCount === 1 ? "" : "s"}</span>}
            </div>
            <h2>{institution.name}</h2>
            <p>{institution.address} · {institution.sector}</p>
            <div className="institution-meta">
              <span>CUE: {institution.cue || "No disponible"}</span>
              <span>{institution.levels.map((level) => level.level).join(" · ")}</span>
            </div>
            <div className="institution-card-footer">
              <small>{assessment.lastDate ? `Hace ${daysSince(assessment.lastDate)} ${daysSince(assessment.lastDate) === 1 ? "día" : "días"}` : "Nunca relevada"}</small>
              <Link
                className={assessment.evaluationCount > 0 ? "secondary-button institution-action" : "primary-button institution-action"}
                href={`/relevamientos/nuevo?institution=${encodeURIComponent(institution.id)}`}
              >
                {assessment.evaluationCount > 0 ? "Actualizar situación" : "Iniciar relevamiento"}
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

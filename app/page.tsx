"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { institutions } from "@/data/institutions"
import type { Evaluation } from "@/types/evaluation"

const STORAGE_KEY = "mei:evaluations"

function readEvaluations(): Evaluation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Evaluation[]
    return parsed.map((evaluation) => ({ ...evaluation, status: evaluation.status ?? "draft" }))
  } catch {
    return []
  }
}

export default function Dashboard() {
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

  const institutionCount = useMemo(() => new Set(evaluations.map((evaluation) => evaluation.institutionId).filter(Boolean)).size, [evaluations])
  const highCriticalityCount = useMemo(() => new Set(evaluations.filter((evaluation) => Object.values(evaluation.responses).some((response) => response.urgency === "alto")).map((evaluation) => evaluation.institutionId).filter(Boolean)).size, [evaluations])
  const pendingCount = useMemo(() => evaluations.filter((evaluation) => (evaluation.status ?? "draft") === "draft").length, [evaluations])

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CIRCUITO 3</p>
          <h1>Matriz de Evaluación Institucional</h1>
          <p className="muted">Relevamiento territorial para el seguimiento institucional.</p>
        </div>
        <div className="topbar-actions"><Link className="secondary-button" href="/instituciones">Instituciones</Link><Link className="primary-button" href="/relevamientos/nuevo">Nuevo relevamiento</Link></div>
      </header>

      <section className="metric-grid" aria-label="Resumen">
        <div className="metric-card"><span>Instituciones relevadas</span><strong>{institutionCount}</strong><small>Instituciones con al menos un relevamiento.</small></div>
        <div className="metric-card"><span>Relevamientos</span><strong>{evaluations.length}</strong><small>Guardados en este dispositivo.</small></div>
        <div className="metric-card"><span>Criticidad alta</span><strong>{highCriticalityCount}</strong><small>Relevamientos con al menos un indicador en nivel alto.</small></div>
        <div className="metric-card"><span>Pendientes</span><strong>{pendingCount}</strong><small>Relevamientos todavía abiertos.</small></div>
      </section>

      <section className="dashboard-card">
        <div className="section-heading">
          <div><p className="eyebrow">TRABAJO EN CURSO</p><h2>Relevamientos guardados</h2></div>
          <Link className="text-link" href="/relevamientos/nuevo">Nuevo →</Link>
        </div>
        {evaluations.length === 0 ? <p>No hay relevamientos guardados todavía.</p> : <div className="saved-list">{evaluations.map((evaluation) => {
          const institution = institutions.find((item) => item.id === evaluation.institutionId)
          const closed = evaluation.status === "closed"
          return (
            <div className="saved-item" key={evaluation.id}>
              <div>
                <strong>{institution?.name ?? "Institución no encontrada"}</strong>
                <span>{evaluation.level ?? "Toda la institución"} · {evaluation.date} · versión {evaluation.version} · {closed ? "Cerrado" : "En curso"}</span>
              </div>
              <Link className="text-link" href={`/relevamientos/nuevo?evaluation=${evaluation.id}`}>{closed ? "Consultar →" : "Continuar →"}</Link>
            </div>
          )
        })}</div>}
      </section>
    </main>
  )
}

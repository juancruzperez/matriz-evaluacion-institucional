"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { institutions } from "@/data/institutions"
import type { Evaluation } from "@/types/evaluation"

const STORAGE_KEY = "mei:evaluations"

type Filter = "all" | "draft" | "closed"

function readEvaluations(): Evaluation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Evaluation[]
    return parsed.map((evaluation) => ({ ...evaluation, status: evaluation.status ?? "draft" }))
  } catch {
    return []
  }
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-AR")
}

export default function RelevamientosPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [status, setStatus] = useState<Filter>("all")
  const [institutionId, setInstitutionId] = useState("all")
  const [query, setQuery] = useState("")

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

  const filteredInstitutions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es")
    if (!normalized) return institutions
    return institutions.filter((institution) => institution.name.toLocaleLowerCase("es").includes(normalized))
  }, [query])

  const filteredEvaluations = useMemo(() => {
    return evaluations
      .filter((evaluation) => status === "all" || evaluation.status === status)
      .filter((evaluation) => institutionId === "all" || evaluation.institutionId === institutionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [evaluations, status, institutionId])

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CIRCUITO 3</p>
          <h1>Relevamientos</h1>
          <p className="muted">Relevamientos abiertos y finalizados.</p>
        </div>
        <Link className="primary-button" href="/relevamientos/nuevo">Nuevo relevamiento</Link>
      </header>

      <section className="form-card relevamientos-filters">
        <div className="section-heading">
          <div><p className="eyebrow">FILTROS</p><h2>Buscar relevamientos</h2></div>
        </div>
        <div className="field-grid">
          <div>
            <label htmlFor="relevamientos-institution-search">Institución</label>
            <input
              id="relevamientos-institution-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar institución..."
            />
            <div className="filter-results">
              <button type="button" className={institutionId === "all" ? "filter-option selected" : "filter-option"} onClick={() => setInstitutionId("all")}>
                Todas las instituciones
              </button>
              {query && filteredInstitutions.slice(0, 6).map((institution) => (
                <button
                  key={institution.id}
                  type="button"
                  className={institutionId === institution.id ? "filter-option selected" : "filter-option"}
                  onClick={() => { setInstitutionId(institution.id); setQuery(institution.name) }}
                >
                  {institution.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="relevamientos-status">Estado</label>
            <select id="relevamientos-status" value={status} onChange={(event) => setStatus(event.target.value as Filter)}>
              <option value="all">Todos</option>
              <option value="draft">Abiertos</option>
              <option value="closed">Finalizados</option>
            </select>
          </div>
        </div>
      </section>

      <section className="dashboard-card">
        <div className="section-heading">
          <div><p className="eyebrow">RESULTADOS</p><h2>{filteredEvaluations.length} relevamiento{filteredEvaluations.length === 1 ? "" : "s"}</h2></div>
        </div>
        {filteredEvaluations.length === 0 ? (
          <p>No hay relevamientos que coincidan con los filtros.</p>
        ) : (
          <div className="saved-list">
            {filteredEvaluations.map((evaluation) => {
              const institution = institutions.find((item) => item.id === evaluation.institutionId)
              const closed = evaluation.status === "closed"
              return (
                <div className="saved-item" key={evaluation.id}>
                  <div>
                    <strong>{institution?.name ?? "Institución no encontrada"}</strong>
                    <span>{evaluation.institutionLevelId ?? "Toda la institución"} · {formatDate(evaluation.date)} · versión {evaluation.version} · {closed ? "Finalizado" : "Abierto"}</span>
                  </div>
                  <Link className="text-link" href={`/relevamientos/nuevo?evaluation=${evaluation.id}`}>
                    {closed ? "Consultar →" : "Continuar →"}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

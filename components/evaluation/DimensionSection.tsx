"use client"

import type { Dimension, Evaluation } from "@/types/evaluation"

type Props = {
  dimension: Dimension
  responses: Evaluation["responses"]
  onChange: (indicatorId: string, field: "observation" | "urgency" | "strengths", value: string) => void
  onFieldChange: (indicatorId: string, fieldId: string, value: string | string[]) => void
  readOnly?: boolean
}

export function DimensionSection({ dimension, responses, onChange, onFieldChange, readOnly = false }: Props) {
  return (
    <section className="dimension-card" id={`dimension-${dimension.id}`}>
      <div className="dimension-heading">
        <div className="dimension-number">{dimension.number}</div>
        <div>
          <p className="eyebrow">DIMENSIÓN</p>
          <h2>{dimension.title}</h2>
          <p>{dimension.objective}</p>
        </div>
      </div>

      <div className="indicator-list">
        {dimension.indicators.map((indicator, index) => {
          const response = responses[indicator.id] ?? { observation: "" }
          return (
            <article className="indicator" key={indicator.id}>
              <div className="indicator-title">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{indicator.title}</h3>
                  <p>{indicator.description}</p>
                </div>
              </div>

              {indicator.fields?.map((field) => {
                const value = response.fields?.[field.id] ?? (field.type === "multiSelect" ? [] : "")
                if (field.type === "multiSelect") {
                  const selected = Array.isArray(value) ? value : []
                  return (
                    <div className="field-block" key={field.id}>
                      <label>{field.label}</label>
                      <div className="check-grid">
                        {field.options?.map((option) => (
                          <label className="check-option" key={option}>
                            <input disabled={readOnly} type="checkbox" checked={selected.includes(option)} onChange={(e) => onFieldChange(indicator.id, field.id, e.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                }
                return (
                  <div className="field-block" key={field.id}>
                    <label htmlFor={`${indicator.id}-${field.id}`}>{field.label}</label>
                    <input disabled={readOnly} id={`${indicator.id}-${field.id}`} type={field.type} value={typeof value === "string" ? value : ""} onChange={(e) => onFieldChange(indicator.id, field.id, e.target.value)} />
                  </div>
                )
              })}

              <label>Estado / Observaciones</label>
              <textarea disabled={readOnly} value={response.observation} onChange={(e) => onChange(indicator.id, "observation", e.target.value)} placeholder="Registrar hallazgos, situación actual y datos relevantes..." />

              {indicator.hasUrgency && (
                <div className="urgency-field">
                  <label>Nivel de urgencia</label>
                  <div className="urgency-options">
                    {(["alto", "medio", "bajo"] as const).map((urgency) => (
                      <button disabled={readOnly} key={urgency} type="button" className={`urgency ${urgency} ${response.urgency === urgency ? "selected" : ""}`} onClick={() => onChange(indicator.id, "urgency", urgency)}>
                        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {indicator.hasStrengths && (
                <>
                  <label>Fortalezas detectadas</label>
                  <textarea disabled={readOnly} value={response.strengths ?? ""} onChange={(e) => onChange(indicator.id, "strengths", e.target.value)} placeholder="Registrar fortalezas, buenas prácticas o capacidades institucionales..." />
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import {
  Suspense,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSearchParams } from "next/navigation"
import { institutions } from "@/data/institutions"
import { dimensions } from "@/lib/evaluation-template"
import type { Evaluation } from "@/types/evaluation"
import { InstitutionSearch } from "@/components/evaluation/InstitutionSearch"
import { DimensionSection } from "@/components/evaluation/DimensionSection"

const STORAGE_KEY = "mei:evaluations"

function createEvaluation(): Evaluation {
  return {
    id: crypto.randomUUID(),
    version: 1,
    status: "draft",
    institutionId: "",
    institutionLevelId: null,
    date: new Date().toISOString().slice(0, 10),
    managementTeamPresent: null,
    managementTeamContact: "",
    responses: {},
    updatedAt: new Date().toISOString(),
  }
}
function readEvaluations(): Evaluation[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as Evaluation[]

    return parsed.map((item) => ({
      ...item,
      status: item.status ?? "draft",
    }))
  } catch {
    return []
  }
}

function NewEvaluationContent() {
  const searchParams = useSearchParams()

  const [evaluation, setEvaluation] = useState<Evaluation>(() =>
    createEvaluation(),
  )

  const [activeDimension, setActiveDimension] = useState<string | null>(
    null,
  )

  useEffect(() => {
    const evaluationId = searchParams.get("evaluation")

    if (evaluationId) {
      const found = readEvaluations().find(
        (item) => item.id === evaluationId,
      )

      if (found) {
        startTransition(() => {
          setEvaluation(found)
        })
      }

      return
    }

    const institutionId = searchParams.get("institution")

    if (
      institutionId &&
      institutions.some((item) => item.id === institutionId)
    ) {
      startTransition(() => {
        setEvaluation((current) => ({
          ...current,
          institutionId,
          institutionLevelId: null,
        }))
      })
    }
  }, [searchParams])

  const institution =
    institutions.find(
      (item) => item.id === evaluation.institutionId,
    ) ?? null

  const readOnly = evaluation.status === "closed"

  const completedIndicators = useMemo(
    () =>
      Object.values(evaluation.responses).filter(
        (item) =>
          item.observation.trim() ||
          item.urgency ||
          item.strengths?.trim() ||
          Object.values(item.fields ?? {}).some((value) =>
            Array.isArray(value)
              ? value.length
              : value,
          ),
      ).length,
    [evaluation.responses],
  )

  const totalIndicators = dimensions.reduce(
    (total, dimension) =>
      total + dimension.indicators.length,
    0,
  )

  const progress = Math.round(
    (completedIndicators / totalIndicators) * 100,
  )

  function updateEvaluation(
    mutator: (current: Evaluation) => Evaluation,
  ) {
    if (readOnly) return

    setEvaluation((current) =>
      mutator({
        ...current,
        updatedAt: new Date().toISOString(),
      }),
    )
  }

  function updateResponse(
    indicatorId: string,
    field: "observation" | "urgency" | "strengths",
    value: string,
  ) {
    updateEvaluation((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [indicatorId]: {
          ...current.responses[indicatorId],
          observation:
            current.responses[indicatorId]?.observation ?? "",
          [field]: value,
        },
      },
    }))
  }

  function updateResponseField(
    indicatorId: string,
    fieldId: string,
    value: string | string[],
  ) {
    updateEvaluation((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [indicatorId]: {
          ...current.responses[indicatorId],
          observation:
            current.responses[indicatorId]?.observation ?? "",
          fields: {
            ...current.responses[indicatorId]?.fields,
            [fieldId]: value,
          },
        },
      },
    }))
  }

  function saveEvaluation() {
    if (readOnly) return

    const saved = readEvaluations()

    const existing = saved.find(
      (item) => item.id === evaluation.id,
    )

    const nextVersion = existing
      ? existing.version + 1
      : evaluation.version

    const current = {
      ...evaluation,
      status: "draft" as const,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    }

    const next = existing
      ? saved.map((item) =>
          item.id === current.id ? current : item,
        )
      : [current, ...saved]

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next),
    )

    setEvaluation(current)

    alert(
      `Relevamiento guardado · versión ${current.version}`,
    )
  }

  function closeEvaluation() {
    if (readOnly) return

    const confirmed = window.confirm(
      "¿Cerrar este relevamiento? Una vez cerrado no podrá editarse y quedará disponible solo para consulta.",
    )

    if (!confirmed) return

    const saved = readEvaluations()

    const current = {
      ...evaluation,
      status: "closed" as const,
      version: evaluation.version + 1,
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const next = saved.some(
      (item) => item.id === current.id,
    )
      ? saved.map((item) =>
          item.id === current.id ? current : item,
        )
      : [current, ...saved]

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next),
    )

    setEvaluation(current)

    alert(
      `Relevamiento cerrado · versión ${current.version}`,
    )
  }

  return (
    <main className="shell narrow">
      <header className="form-topbar">
        <div>
          <Link className="back-link" href="/">
            ← Dashboard
          </Link>

          <p className="eyebrow">
            CIRCUITO 3 ·{" "}
            {readOnly ? "CONSULTA" : "RELEVAMIENTO"}
          </p>

          <h1>Relevamiento institucional</h1>

          <p className="muted">
            Versión {evaluation.version} ·{" "}
            {readOnly
              ? "cerrado · solo consulta"
              : "guardado manual"}
          </p>
        </div>

        <div className="progress">
          <span>
            {completedIndicators}/{totalIndicators}{" "}
            indicadores
          </span>

          <div>
            <i
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </header>

      <section className="form-card identification">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01</p>
            <h2>Datos de identificación</h2>
          </div>
        </div>

        <InstitutionSearch
          institutions={institutions}
          value={institution}
          disabled={readOnly}
          onChange={(selected) =>
            updateEvaluation((current) => ({
              ...current,
              institutionId: selected?.id ?? "",
              institutionLevelId: null,
            }))
          }
        />

        {institution && (
          <div className="institution-summary">
            <div>
              <strong>{institution.name}</strong>

              <span>
                {institution.address} ·{" "}
                {institution.sector}
              </span>

              <span>
                CUE: {institution.cue || "No disponible"}
              </span>
            </div>

            <div className="level-field">
              <label htmlFor="level">
                Nivel / Modalidad
              </label>

              <select
                disabled={readOnly}
                id="level"
                value={evaluation.institutionLevelId ?? ""}
                onChange={(e) =>
                  updateEvaluation((current) => ({
                    ...current,
                    institutionLevelId: e.target.value || null,
                  }))
                }
              >
                <option value="">
                  Toda la institución
                </option>

                {institution.levels.map((level) => (
                  <option
                    key={`${level.level}-${level.empresa}`}
                    value={level.level}
                  >
                    {level.level}
                    {level.empresa
                      ? ` · ${level.empresa}`
                      : ""}
                  </option>
                ))}
              </select>

              <small>
                Opcional. Si no seleccionás un nivel,
                el relevamiento corresponde a toda la
                institución.
              </small>
            </div>
          </div>
        )}

        <div className="field-grid">
          <div>
            <label htmlFor="date">
              Fecha de visita
            </label>

            <input
              disabled={readOnly}
              id="date"
              type="date"
              value={evaluation.date}
              onChange={(e) =>
                updateEvaluation((current) => ({
                  ...current,
                  date: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label htmlFor="team">
              Equipo directivo presente
            </label>

            <select
              disabled={readOnly}
              id="team"
              value={
                evaluation.managementTeamPresent === null
                  ? ""
                  : String(
                      evaluation.managementTeamPresent,
                    )
              }
              onChange={(e) =>
                updateEvaluation((current) => ({
                  ...current,
                  managementTeamPresent:
                    e.target.value === ""
                      ? null
                      : e.target.value === "true",
                }))
              }
            >
              <option value="">
                Seleccionar
              </option>

              <option value="true">
                Presente
              </option>

              <option value="false">
                No presente
              </option>
            </select>
          </div>
        </div>

        <div className="field-block team-contact">
          <label htmlFor="team-contact">
            Cargo y nombre de la persona presente
          </label>

          <input
            disabled={readOnly}
            id="team-contact"
            value={evaluation.managementTeamContact}
            onChange={(e) =>
              updateEvaluation((current) => ({
                ...current,
                managementTeamContact: e.target.value,
              }))
            }
            placeholder="Ej.: Directora · María Pérez"
          />
        </div>
      </section>

      <section className="dimensions-nav">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DIMENSIONES</p>
            <h2>Seleccioná una dimensión</h2>
          </div>
        </div>

        <div className="dimension-tabs">
          {dimensions.map((dimension) => (
            <button
              key={dimension.id}
              type="button"
              className={
                activeDimension === dimension.id
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveDimension(
                  activeDimension === dimension.id
                    ? null
                    : dimension.id,
                )
              }
            >
              <span>{dimension.number}</span>

              <div>
                <strong>{dimension.title}</strong>

                <small>
                  {dimension.indicators.length}{" "}
                  indicadores
                </small>
              </div>

              <b>
                {activeDimension === dimension.id
                  ? "−"
                  : "+"}
              </b>
            </button>
          ))}
        </div>
      </section>

      {activeDimension && (
        <DimensionSection
          dimension={
            dimensions.find(
              (dimension) =>
                dimension.id === activeDimension,
            )!
          }
          responses={evaluation.responses}
          onChange={updateResponse}
          onFieldChange={updateResponseField}
          readOnly={readOnly}
        />
      )}

      <div className="save-bar">
        {readOnly ? (
          <div>
            <strong>Relevamiento cerrado</strong>

            <span>
              Versión {evaluation.version} ·{" "}
              {evaluation.closedAt
                ? `cerrado el ${new Date(
                    evaluation.closedAt,
                  ).toLocaleString("es-AR")}`
                : "solo consulta"}
              .
            </span>
          </div>
        ) : (
          <div>
            <strong>Relevamiento en curso</strong>

            <span>
              Podés guardar aunque no hayas completado
              todas las dimensiones.
            </span>
          </div>
        )}

        {!readOnly && (
          <div className="save-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={saveEvaluation}
            >
              Guardar relevamiento
            </button>

            <button
              className="primary-button"
              type="button"
              onClick={closeEvaluation}
            >
              Cerrar relevamiento
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function NewEvaluationPage() {
  return (
    <Suspense
      fallback={
        <div className="shell narrow">
          Cargando relevamiento...
        </div>
      }
    >
      <NewEvaluationContent />
    </Suspense>
  )
}
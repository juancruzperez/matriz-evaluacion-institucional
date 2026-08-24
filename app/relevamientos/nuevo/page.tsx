"use client"

import Link from "next/link"
import {
  Suspense,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { institutions } from "@/data/institutions"
import { dimensions } from "@/lib/evaluation-template"
import {
  createEvaluationResponse,
  getEvaluationResponse,
  upsertEvaluationResponse,
} from "@/lib/evaluation-responses"

import type { Evaluation } from "@/types/evaluation"

import { InstitutionSearch } from "@/components/evaluation/InstitutionSearch"
import { DimensionSection } from "@/components/evaluation/DimensionSection"

function createEvaluation(): Evaluation {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    version: 1,
    status: "draft",
    institutionId: "",
    institutionLevelId: null,
    date: now.slice(0, 10),
    managementTeamPresent: null,
    managementTeamContact: "",
    responses: [],
    createdBy: "",
    updatedBy: "",
    createdAt: now,
    updatedAt: now,
  }
}

function NewEvaluationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [evaluation, setEvaluation] =
    useState<Evaluation>(() =>
      createEvaluation(),
    )

  const [persisted, setPersisted] =
    useState(false)

  const [activeDimension, setActiveDimension] =
    useState<string | null>(null)

  const [loadingEvaluation, setLoadingEvaluation] =
    useState(false)

  const [redirectingToOpenEvaluation, setRedirectingToOpenEvaluation] =
    useState(false)

  const [loadError, setLoadError] =
    useState<string | null>(null)

  /*
   * Carga de un relevamiento existente.
   *
   * Si llega ?evaluation=ID, la fuente de verdad
   * es Neon mediante GET /api/evaluations/:id.
   */
  useEffect(() => {
    const evaluationId =
      searchParams.get("evaluation")

    if (evaluationId) {
      async function loadEvaluation() {
        try {
          setLoadingEvaluation(true)
          setLoadError(null)

          const response = await fetch(
            `/api/evaluations/${evaluationId}`,
          )

          const data =
            await response.json()

          if (!response.ok) {
            throw new Error(
              data?.error ??
                `Unable to load evaluation: ${response.status}`,
            )
          }

          const loaded =
            data as Evaluation

          startTransition(() => {
            setEvaluation(loaded)
            setPersisted(true)
          })
        } catch (error) {
          console.error(
            "Error al cargar el relevamiento",
            error,
          )

          startTransition(() => {
            setLoadError(
              "No se pudo cargar el relevamiento.",
            )
          })
        } finally {
          setLoadingEvaluation(false)
        }
      }

      void loadEvaluation()

      return
    }

    /*
     * Si llega ?institution=ID estamos intentando
     * iniciar un nuevo relevamiento.
     *
     * Antes de permitirlo consultamos Neon para
     * verificar si ya existe uno abierto.
     */
    const institutionParam =
      searchParams.get("institution")

    if (!institutionParam) {
      return
    }

    const institutionId =
      institutionParam

    const institutionExists =
      institutions.some(
        (item) => item.id === institutionId,
      )

    if (!institutionExists) {
      startTransition(() => {
        setLoadError(
          "La institución seleccionada no existe.",
        )
      })

      return
    }

    async function checkOpenEvaluation() {
      try {
        setLoadingEvaluation(true)
        setLoadError(null)

        const response = await fetch(
          "/api/evaluations",
        )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ??
              "No se pudieron consultar los relevamientos.",
          )
        }

        const evaluations =
          data as Evaluation[]

        const openEvaluation =
          evaluations.find(
            (item) =>
              item.institutionId ===
                institutionId &&
              item.status !== "closed",
          )

        /*
         * Ya existe un relevamiento abierto:
         * no creamos uno nuevo y llevamos al
         * usuario directamente al existente.
         */
        if (openEvaluation) {
          setRedirectingToOpenEvaluation(
            true,
          )

          router.replace(
            `/relevamientos/nuevo?evaluation=${openEvaluation.id}`,
          )

          return
        }

        /*
         * No existe relevamiento abierto:
         * podemos comenzar uno nuevo.
         */
        startTransition(() => {
          setEvaluation((current) => ({
            ...current,
            institutionId,
            institutionLevelId: null,
          }))

          setPersisted(false)
        })
      } catch (error) {
        console.error(
          "Error al verificar relevamiento abierto",
          error,
        )

        startTransition(() => {
          setLoadError(
            "No se pudo verificar si la institución tiene un relevamiento abierto.",
          )
        })
      } finally {
        setLoadingEvaluation(false)
      }
    }

    void checkOpenEvaluation()
  }, [searchParams, router])

  const institution =
    institutions.find(
      (item) =>
        item.id ===
        evaluation.institutionId,
    ) ?? null

  const readOnly =
    evaluation.status === "closed"

  const hasResponseContent = (
    response: Evaluation["responses"][number],
  ) =>
    response.observation.trim() ||
    response.urgency ||
    response.strengths?.trim() ||
    Object.values(
      response.fields ?? {},
    ).some((value) =>
      Array.isArray(value)
        ? value.length > 0
        : Boolean(value),
    )

  const completedIndicators = useMemo(
    () =>
      evaluation.responses.filter(
        (response) =>
          hasResponseContent(response),
      ).length,
    [evaluation.responses],
  )

  const totalIndicators =
    dimensions.reduce(
      (total, dimension) =>
        total +
        dimension.indicators.length,
      0,
    )

  const progress =
    totalIndicators === 0
      ? 0
      : Math.round(
          (completedIndicators /
            totalIndicators) *
            100,
        )

  function updateEvaluation(
    mutator: (
      current: Evaluation,
    ) => Evaluation,
  ) {
    if (readOnly) return

    setEvaluation((current) =>
      mutator({
        ...current,
        updatedAt:
          new Date().toISOString(),
      }),
    )
  }

  function updateResponse(
    indicatorId: string,
    field:
      | "observation"
      | "urgency"
      | "strengths",
    value: string,
  ) {
    updateEvaluation((current) => {
      const existingResponse =
        getEvaluationResponse(
          current.responses,
          indicatorId,
        )

      const response =
        existingResponse ??
        createEvaluationResponse(
          current.id,
          indicatorId,
        )

      const updatedResponse = {
        ...response,
        [field]: value,
      }

      return {
        ...current,
        responses:
          upsertEvaluationResponse(
            current.responses,
            updatedResponse,
          ),
      }
    })
  }

  function updateResponseField(
    indicatorId: string,
    fieldId: string,
    value: string | string[],
  ) {
    updateEvaluation((current) => {
      const existingResponse =
        getEvaluationResponse(
          current.responses,
          indicatorId,
        )

      const response =
        existingResponse ??
        createEvaluationResponse(
          current.id,
          indicatorId,
        )

      const updatedResponse = {
        ...response,
        fields: {
          ...response.fields,
          [fieldId]: value,
        },
      }

      return {
        ...current,
        responses:
          upsertEvaluationResponse(
            current.responses,
            updatedResponse,
          ),
      }
    })
  }

  async function saveEvaluation() {
    if (readOnly) return

    try {
      const payload = {
        institutionId:
          evaluation.institutionId,
        institutionLevelId:
          evaluation.institutionLevelId,
        date: evaluation.date,
        managementTeamPresent:
          evaluation.managementTeamPresent,
        managementTeamContact:
          evaluation.managementTeamContact,
        responses:
          evaluation.responses.map(
            (item) => ({
              indicatorId:
                item.indicatorId,
              observation:
                item.observation,
              urgency: item.urgency,
              strengths:
                item.strengths,
              fields: item.fields,
            }),
          ),
      }

      const response = await fetch(
        persisted
          ? `/api/evaluations/${evaluation.id}`
          : "/api/evaluations",
        {
          method: persisted
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload,
          ),
        },
      )

      const data =
        await response.json()

      /*
       * Segunda barrera:
       * si otra persona creó un relevamiento
       * entre nuestra consulta inicial y este
       * POST, el backend devuelve 409 con
       * evaluationId.
       */
      if (
        response.status === 409 &&
        data?.evaluationId
      ) {
        router.replace(
          `/relevamientos/nuevo?evaluation=${data.evaluationId}`,
        )

        return
      }

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "No se pudo guardar el relevamiento.",
        )
      }

      const saved =
        data as Evaluation

      setEvaluation(saved)
      setPersisted(true)

      alert(
        `Relevamiento guardado · versión ${saved.version}`,
      )
    } catch (error) {
      console.error(
        "Error al guardar el relevamiento",
        error,
      )

      alert(
        "No se pudo guardar el relevamiento. Verificá tu conexión e intentá nuevamente.",
      )
    }
  }

  async function closeEvaluation() {
    if (readOnly) return

    if (completedIndicators === 0) {
      alert(
        "No se puede cerrar el relevamiento porque está completamente vacío.",
      )

      return
    }

    const confirmed = window.confirm(
      "¿Cerrar este relevamiento? Una vez cerrado no podrá editarse y quedará disponible solo para consulta.",
    )

    if (!confirmed) return

    try {
      /*
       * Si hay cambios realizados desde el último guardado,
       * primero los persistimos mediante PATCH.
       *
       * De esta manera nunca cerramos en Neon una versión
       * anterior a lo que el usuario está viendo.
       */
      let currentEvaluation = evaluation

      if (persisted) {
        const payload = {
          institutionId:
            evaluation.institutionId,
          institutionLevelId:
            evaluation.institutionLevelId,
          date: evaluation.date,
          managementTeamPresent:
            evaluation.managementTeamPresent,
          managementTeamContact:
            evaluation.managementTeamContact,
          responses:
            evaluation.responses.map(
              (item) => ({
                indicatorId:
                  item.indicatorId,
                observation:
                  item.observation,
                urgency: item.urgency,
                strengths:
                  item.strengths,
                fields: item.fields,
              }),
            ),
        }

        const saveResponse =
          await fetch(
            `/api/evaluations/${evaluation.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                payload,
              ),
            },
          )

        const saveData =
          await saveResponse.json()

        if (!saveResponse.ok) {
          throw new Error(
            saveData?.error ??
              "No se pudieron guardar los cambios antes de cerrar.",
          )
        }

        currentEvaluation =
          saveData as Evaluation

        setEvaluation(
          currentEvaluation,
        )
      }

      /*
       * Ahora cerramos realmente en Neon.
       */
      const closeResponse =
        await fetch(
          `/api/evaluations/${currentEvaluation.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "close",
            }),
          },
        )

      const closeData =
        await closeResponse.json()

      if (!closeResponse.ok) {
        throw new Error(
          closeData?.error ??
            "No se pudo cerrar el relevamiento.",
        )
      }

      const closedEvaluation =
        closeData as Evaluation

      setEvaluation(
        closedEvaluation,
      )
      setPersisted(true)

      alert(
        `Relevamiento cerrado · versión ${closedEvaluation.version}`,
      )
    } catch (error) {
      console.error(
        "Error al cerrar el relevamiento",
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo cerrar el relevamiento.",
      )
    }
  }

  /*
   * Mientras verificamos si existe un relevamiento
   * abierto, no mostramos el formulario para evitar
   * que el usuario empiece a completar uno que luego
   * será descartado.
   */
  if (
    loadingEvaluation ||
    redirectingToOpenEvaluation
  ) {
    return (
      <main className="shell narrow">
        <section className="form-card">
          <p className="eyebrow">
            RELEVAMIENTO INSTITUCIONAL
          </p>

          <h1>
            {redirectingToOpenEvaluation
              ? "Relevamiento ya iniciado"
              : "Verificando relevamiento"}
          </h1>

          <p className="muted">
            {redirectingToOpenEvaluation
              ? "La institución ya tiene un relevamiento abierto. Te estamos llevando al relevamiento existente."
              : "Consultando los relevamientos existentes..."}
          </p>
        </section>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="shell narrow">
        <section className="form-card">
          <p className="eyebrow">
            RELEVAMIENTO INSTITUCIONAL
          </p>

          <h1>
            No se pudo cargar
          </h1>

          <p className="muted">
            {loadError}
          </p>

          <div className="save-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                window.location.reload()
              }
            >
              Reintentar
            </button>

            <Link
              className="primary-button"
              href="/instituciones"
            >
              Volver a instituciones
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="shell narrow">
      <header className="form-topbar">
        <div>
          <Link
            className="back-link"
            href="/"
          >
            ← Dashboard
          </Link>

          <p className="eyebrow">
            CIRCUITO 3 ·{" "}
            {readOnly
              ? "CONSULTA"
              : "RELEVAMIENTO"}
          </p>

          <h1>
            Relevamiento institucional
          </h1>

          <p className="muted">
            Versión {evaluation.version} ·{" "}
            {readOnly
              ? "cerrado · solo consulta"
              : "guardado manual"}
          </p>
        </div>

        <div className="progress">
          <span>
            {completedIndicators}/
            {totalIndicators} indicadores
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
            <p className="eyebrow">
              01
            </p>

            <h2>
              Datos de identificación
            </h2>
          </div>
        </div>

        <InstitutionSearch
          institutions={institutions}
          value={institution}
          disabled={readOnly}
          onChange={(selected) =>
            updateEvaluation(
              (current) => ({
                ...current,
                institutionId:
                  selected?.id ?? "",
                institutionLevelId:
                  null,
              }),
            )
          }
        />

        {institution && (
          <div className="institution-summary">
            <div>
              <strong>
                {institution.name}
              </strong>

              <span>
                {institution.address} ·{" "}
                {institution.sector}
              </span>

              <span>
                CUE:{" "}
                {institution.cue ||
                  "No disponible"}
              </span>
            </div>

            <div className="level-field">
              <label htmlFor="level">
                Nivel / Modalidad
              </label>

              <select
                disabled={readOnly}
                id="level"
                value={
                  evaluation.institutionLevelId ??
                  ""
                }
                onChange={(e) =>
                  updateEvaluation(
                    (current) => ({
                      ...current,
                      institutionLevelId:
                        e.target.value ||
                        null,
                    }),
                  )
                }
              >
                <option value="">
                  Toda la institución
                </option>

                {institution.levels.map(
                  (level) => (
                    <option
                      key={`${level.id}`}
                      value={level.id}
                    >
                      {level.level}
                      {level.empresa
                        ? ` · ${level.empresa}`
                        : ""}
                    </option>
                  ),
                )}
              </select>

              <small>
                Opcional. Si no
                seleccionás un nivel,
                el relevamiento
                corresponde a toda la
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
              value={
                evaluation.date.includes(
                  "T",
                )
                  ? evaluation.date.slice(
                      0,
                      10,
                    )
                  : evaluation.date
              }
              onChange={(e) =>
                updateEvaluation(
                  (current) => ({
                    ...current,
                    date: e.target.value,
                  }),
                )
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
                evaluation.managementTeamPresent ===
                null
                  ? ""
                  : String(
                      evaluation.managementTeamPresent,
                    )
              }
              onChange={(e) =>
                updateEvaluation(
                  (current) => ({
                    ...current,
                    managementTeamPresent:
                      e.target.value ===
                      ""
                        ? null
                        : e.target.value ===
                          "true",
                  }),
                )
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
            Cargo y nombre de la
            persona presente
          </label>

          <input
            disabled={readOnly}
            id="team-contact"
            value={
              evaluation.managementTeamContact
            }
            onChange={(e) =>
              updateEvaluation(
                (current) => ({
                  ...current,
                  managementTeamContact:
                    e.target.value,
                }),
              )
            }
            placeholder="Ej.: Directora · María Pérez"
          />
        </div>
      </section>

      <section className="dimensions-nav">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              DIMENSIONES
            </p>

            <h2>
              Seleccioná una dimensión
            </h2>
          </div>
        </div>

        <div className="dimension-tabs">
          {dimensions.map(
            (dimension) => (
              <button
                key={dimension.id}
                type="button"
                className={
                  activeDimension ===
                  dimension.id
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveDimension(
                    activeDimension ===
                      dimension.id
                      ? null
                      : dimension.id,
                  )
                }
              >
                <span>
                  {dimension.number}
                </span>

                <div>
                  <strong>
                    {dimension.title}
                  </strong>

                  <small>
                    {
                      dimension
                        .indicators
                        .length
                    }{" "}
                    indicadores
                  </small>
                </div>

                <b>
                  {activeDimension ===
                  dimension.id
                    ? "−"
                    : "+"}
                </b>
              </button>
            ),
          )}
        </div>
      </section>

      {activeDimension && (
        <DimensionSection
          dimension={
            dimensions.find(
              (dimension) =>
                dimension.id ===
                activeDimension,
            )!
          }
          responses={
            evaluation.responses
          }
          onChange={updateResponse}
          onFieldChange={
            updateResponseField
          }
          readOnly={readOnly}
        />
      )}

      <div className="save-bar">
        {readOnly ? (
          <div>
            <strong>
              Relevamiento cerrado
            </strong>

            <span>
              Versión{" "}
              {evaluation.version} ·{" "}
              {evaluation.closedAt
                ? `cerrado el ${new Date(
                    evaluation.closedAt,
                  ).toLocaleString(
                    "es-AR",
                  )}`
                : "solo consulta"}
              .
            </span>
          </div>
        ) : (
          <div>
            <strong>
              Relevamiento en curso
            </strong>

            <span>
              Podés guardar aunque no
              hayas completado todas
              las dimensiones.
            </span>
          </div>
        )}

        {!readOnly && (
          <div className="save-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={
                saveEvaluation
              }
            >
              Guardar relevamiento
            </button>

            <button
              className="primary-button"
              type="button"
              onClick={
                closeEvaluation
              }
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
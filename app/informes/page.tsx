"use client"

import { useEffect, useMemo, useState } from "react"

type Institution = {
  id: string
  name: string
  localidad: string | null
  departamento: string | null
}

type CriticalityFilter =
  | "all"
  | "alta"
  | "media"
  | "baja"

type PeriodFilter =
  | "all"
  | "week"
  | "month"
  | "custom"

function buildReportUrl(
  basePath: string,
  filters: {
    departamento: string
    localidad: string
    criticidad: CriticalityFilter
    desde: string
    hasta: string
  },
) {
  const params = new URLSearchParams()

  if (filters.departamento !== "todos") {
    params.set(
      "departamento",
      filters.departamento,
    )
  }

  if (filters.localidad !== "todas") {
    params.set(
      "localidad",
      filters.localidad,
    )
  }

  if (filters.criticidad !== "all") {
    params.set(
      "criticidad",
      filters.criticidad,
    )
  }

  if (filters.desde) {
    params.set("desde", filters.desde)
  }

  if (filters.hasta) {
    params.set("hasta", filters.hasta)
  }

  const query = params.toString()

  return query
    ? `${basePath}?${query}`
    : basePath
}

export default function InformesPage() {
  const [institutions, setInstitutions] =
    useState<Institution[]>([])

  const [loadingInstitutions, setLoadingInstitutions] =
    useState(true)

  const [institutionsError, setInstitutionsError] =
    useState<string | null>(null)

  const [departamento, setDepartamento] =
    useState("todos")

  const [localidad, setLocalidad] =
    useState("todas")

  const [criticidad, setCriticidad] =
    useState<CriticalityFilter>("all")

  const [periodo, setPeriodo] =
    useState<PeriodFilter>("all")

  const [desde, setDesde] =
    useState("")

  const [hasta, setHasta] =
    useState("")

  const [generating, setGenerating] =
    useState<"pdf" | "csv" | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    const controller =
      new AbortController()

    const loadInstitutions = async () => {
      try {
        setLoadingInstitutions(true)
        setInstitutionsError(null)

        const response = await fetch(
          "/api/institutions",
          {
            cache: "no-store",
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error(
            "No se pudieron cargar las instituciones.",
          )
        }

        const data =
          (await response.json()) as Institution[]

        if (controller.signal.aborted) {
          return
        }

        setInstitutions(data)
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }

        console.error(
          "Error al cargar instituciones:",
          err,
        )

        setInstitutionsError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las instituciones.",
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoadingInstitutions(false)
        }
      }
    }

    void loadInstitutions()

    return () => {
      controller.abort()
    }
  }, [])

  const departamentos = useMemo(() => {
    const values = new Set<string>()

    for (const institution of institutions) {
      const value =
        institution.departamento?.trim()

      if (value) {
        values.add(value)
      }
    }

    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, "es"),
    )
  }, [institutions])

  const localidades = useMemo(() => {
    const values = new Set<string>()

    for (const institution of institutions) {
      if (
        departamento !== "todos" &&
        institution.departamento !== departamento
      ) {
        continue
      }

      const value =
        institution.localidad?.trim()

      if (value) {
        values.add(value)
      }
    }

    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, "es"),
    )
  }, [institutions, departamento])

  const resetFilters = () => {
    setDepartamento("todos")
    setLocalidad("todas")
    setCriticidad("all")
    setPeriodo("all")
    setDesde("")
    setHasta("")
    setError(null)
  }

  const handleDepartamentoChange = (
    value: string,
  ) => {
    setDepartamento(value)
    setLocalidad("todas")
  }

  const handlePeriodoChange = (
    value: PeriodFilter,
  ) => {
    setPeriodo(value)

    if (value === "all") {
      setDesde("")
      setHasta("")
      return
    }

    if (value === "week") {
      const now = new Date()
      const from = new Date(now)

      from.setDate(
        from.getDate() - 6,
      )

      setDesde(
        from.toISOString().slice(0, 10),
      )

      setHasta(
        now.toISOString().slice(0, 10),
      )

      return
    }

    if (value === "month") {
      const now = new Date()
      const from = new Date(now)

      from.setDate(
        from.getDate() - 29,
      )

      setDesde(
        from.toISOString().slice(0, 10),
      )

      setHasta(
        now.toISOString().slice(0, 10),
      )

      return
    }

    setDesde("")
    setHasta("")
  }

  const handleDownload = async (
    format: "pdf" | "csv",
  ) => {
    try {
      setGenerating(format)
      setError(null)

      if (
        periodo === "custom" &&
        desde &&
        hasta &&
        desde > hasta
      ) {
        setError(
          "La fecha de inicio no puede ser posterior a la fecha de finalización.",
        )
        return
      }

      if (
        periodo === "custom" &&
        (!desde || !hasta)
      ) {
        setError(
          "Para seleccionar un período personalizado debés indicar las fechas Desde y Hasta.",
        )
        return
      }

      const url = buildReportUrl(
        `/api/reports/incidences/${format}`,
        {
          departamento,
          localidad,
          criticidad,
          desde,
          hasta,
        },
      )

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        let message =
          "No se pudo generar el informe."

        try {
          const data =
            (await response.json()) as {
              error?: string
            }

          if (data.error) {
            message = data.error
          }
        } catch {
          // El endpoint puede responder con texto.
        }

        throw new Error(message)
      }

      const blob =
        await response.blob()

      const objectUrl =
        URL.createObjectURL(blob)

      const link =
        document.createElement("a")

      link.href = objectUrl

      link.download =
        format === "pdf"
          ? "informe-incidencias-abiertas.pdf"
          : "informe-incidencias-abiertas.csv"

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    } catch (err) {
      console.error(
        "Error generando informe:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo generar el informe.",
      )
    } finally {
      setGenerating(null)
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            INFORMES
          </p>

          <h1>
            Generación de informes
          </h1>

          <p className="muted">
            Generá informes institucionales
            a partir de la información
            territorial registrada en SIATE.
          </p>
        </div>
      </header>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              INFORME DISPONIBLE
            </p>

            <h2>
              Incidencias abiertas
            </h2>
          </div>

          <button
            type="button"
            className="text-link"
            onClick={resetFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <p
          className="muted"
          style={{
            marginTop: 0,
            marginBottom: "1.25rem",
          }}
        >
          Informe de incidencias agrupadas
          por institución y ordenadas por
          criticidad.
        </p>

        <div className="field-grid">
          <div>
            <label htmlFor="report-departamento">
              Departamento
            </label>

            <select
              id="report-departamento"
              value={departamento}
              onChange={(event) =>
                handleDepartamentoChange(
                  event.target.value,
                )
              }
              disabled={
                loadingInstitutions
              }
            >
              <option value="todos">
                Todos los departamentos
              </option>

              {departamentos.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label htmlFor="report-localidad">
              Localidad
            </label>

            <select
              id="report-localidad"
              value={localidad}
              onChange={(event) =>
                setLocalidad(
                  event.target.value,
                )
              }
              disabled={
                loadingInstitutions ||
                localidades.length === 0
              }
            >
              <option value="todas">
                Todas las localidades
              </option>

              {localidades.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label htmlFor="report-criticidad">
              Criticidad
            </label>

            <select
              id="report-criticidad"
              value={criticidad}
              onChange={(event) =>
                setCriticidad(
                  event.target
                    .value as CriticalityFilter,
                )
              }
            >
              <option value="all">
                Todas las criticidades
              </option>

              <option value="alta">
                Alta
              </option>

              <option value="media">
                Media
              </option>

              <option value="baja">
                Baja
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="report-periodo">
              Período
            </label>

            <select
              id="report-periodo"
              value={periodo}
              onChange={(event) =>
                handlePeriodoChange(
                  event.target
                    .value as PeriodFilter,
                )
              }
            >
              <option value="all">
                Todo el período
              </option>

              <option value="week">
                Últimos 7 días
              </option>

              <option value="month">
                Últimos 30 días
              </option>

              <option value="custom">
                Seleccionar fechas
              </option>
            </select>
          </div>
        </div>

        {periodo === "custom" && (
          <div
            className="field-grid"
            style={{
              marginTop: "1rem",
            }}
          >
            <div>
              <label htmlFor="report-desde">
                Desde
              </label>

              <input
                id="report-desde"
                type="date"
                value={desde}
                onChange={(event) =>
                  setDesde(
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label htmlFor="report-hasta">
                Hasta
              </label>

              <input
                id="report-hasta"
                type="date"
                value={hasta}
                min={
                  desde || undefined
                }
                onChange={(event) =>
                  setHasta(
                    event.target.value,
                  )
                }
              />
            </div>
          </div>
        )}

        {institutionsError && (
          <p
            className="muted"
            style={{
              marginTop: "1rem",
            }}
          >
            {institutionsError}
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              marginTop: "1rem",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop:
              "1px solid #e3e0e6",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="muted">
              Formatos disponibles
            </span>

            <p
              style={{
                margin: "0.2rem 0 0",
                fontWeight: 600,
              }}
            >
              PDF institucional · CSV
              analítico
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                void handleDownload("csv")
              }
              disabled={
                generating !== null
              }
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                table_view
              </span>

              {generating === "csv"
                ? "Generando CSV..."
                : "Descargar CSV"}
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                void handleDownload("pdf")
              }
              disabled={
                generating !== null
              }
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                picture_as_pdf
              </span>

              {generating === "pdf"
                ? "Generando PDF..."
                : "Descargar PDF"}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"

import { fetcher } from "@/lib/fetcher"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"

import {
  type Criticality,
} from "@/lib/criticality"
import { dimensions } from "@/lib/evaluation-template"
import type { Institution } from "@/types/institution"

type TerritoryFilter =
  | "all"
  | `department:${string}`
  | `circuit:${number}`

type CriticalityFilter = "all" | Criticality

type TimeFilter =
  | "all"
  | "week"
  | "month"
  | "custom"

type SectionFeature = {
  type: "Feature"
  properties?: {
    NUMERO?: number | string
    [key: string]: unknown
  }
  geometry: unknown
}

type SectionGeoJSON = {
  type: "FeatureCollection"
  features: SectionFeature[]
}

type IncidenceApiResponse = {
  id: string
  evaluationResponseId: string
  evaluationId: string
  institutionId: string
  status: "open" | "resolved"
  resolutionDescription: string | null
  createdAt: string
  resolvedAt: string | null

  currentUrgency: "alto" | "medio" | "bajo"
  urgencyHistory: {
    id: string
    previousUrgency: "alto" | "medio" | "bajo" | null
    newUrgency: "alto" | "medio" | "bajo"
    changedAt: string
    changedBy: string
    reason: string | null
  }[]

  response: {
    urgency: "alto" | "medio" | "bajo" | null
    observation: string
    strengths: string | null
    fields: Record<
      string,
      string | string[]
    > | null
  }

  evaluation: {
    date: string
    closedAt: string | null
  }

  institution: {
    id: string
    name: string
    cue: string
    localidad: string | null
    departamento: string | null
  }

  indicator: {
    id: string | null
    name: string | null
  }

  dimension: {
    name: string | null
  }
}

type IncidenceResponse = IncidenceApiResponse["response"]

type Incidence = IncidenceApiResponse & {
  criticality: Criticality
  dimensionNumber: string
  dimensionTitle: string
  indicatorTitle: string
  indicatorDescription: string
}


const CRITICALITY_ORDER: Record<Criticality, number> = {
  alta: 0,
  media: 1,
  baja: 2,
  "sin-relevamiento": 3,
}

const CRITICALITY_COLORS: Record<Criticality, string> = {
  alta: "#BF1363",
  media: "#FFE066",
  baja: "#43AA8B",
  "sin-relevamiento": "#C1B8C8",
}

const URGENCY_LABELS: Record<IncidenceApiResponse["currentUrgency"], string> = {
  alto: "Alta",
  medio: "Media",
  bajo: "Baja",
}

const URGENCY_COLORS: Record<IncidenceApiResponse["currentUrgency"], string> = {
  alto: "#BF1363",
  medio: "#FFE066",
  bajo: "#43AA8B",
}

function normalizeDepartmentName(
  value: string | null | undefined,
) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es")
}

function formatDate(
  date: string | null | undefined,
) {
  if (!date) {
    return "Fecha no disponible"
  }

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return "Fecha no disponible"
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function parseDateOnly(date: string) {
  const [year, month, day] =
    date.split("-").map(Number)

  return new Date(year, month - 1, day)
}

function getDateRange(
  timeFilter: TimeFilter,
  customFrom: string,
  customTo: string,
) {
  if (timeFilter === "all") {
    return null
  }

  if (timeFilter === "custom") {
    if (!customFrom && !customTo) {
      return null
    }

    const from = customFrom
      ? parseDateOnly(customFrom)
      : null

    const to = customTo
      ? parseDateOnly(customTo)
      : null

    if (from) {
      from.setHours(0, 0, 0, 0)
    }

    if (to) {
      to.setHours(23, 59, 59, 999)
    }

    return {
      from,
      to,
    }
  }

  const now = new Date()

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  )

  const days =
    timeFilter === "week" ? 7 : 30

  const start = new Date(end)

  start.setDate(
    start.getDate() - (days - 1),
  )

  start.setHours(0, 0, 0, 0)

  return {
    from: start,
    to: end,
  }
}

function getResponseContext(
  response: IncidenceResponse,
) {
  const context: string[] = []

  if (response.observation?.trim()) {
    context.push(response.observation.trim())
  }

  if (response.strengths?.trim()) {
    context.push(response.strengths.trim())
  }

  if (response.fields) {
    for (const [key, value] of Object.entries(
      response.fields,
    )) {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        continue
      }

      const formattedValue =
        Array.isArray(value)
          ? value.join(", ")
          : String(value)

      if (!formattedValue.trim()) {
        continue
      }

      context.push(
        `${key}: ${formattedValue}`,
      )
    }
  }

  return context
}

function getManagementContext(
  incidence: IncidenceApiResponse,
) {
  const history = incidence.urgencyHistory

  if (history.length > 0) {
    const latestChange = history[history.length - 1]

    if (latestChange.reason?.trim()) {
      return [latestChange.reason.trim()]
    }
  }

  if (incidence.status === "resolved" && incidence.resolutionDescription?.trim()) {
    return [incidence.resolutionDescription.trim()]
  }

  return getResponseContext(incidence.response)
}

function getLastModificationDate(
  incidence: IncidenceApiResponse,
) {
  const dates = incidence.urgencyHistory
    .map((change) => change.changedAt)

  if (incidence.resolvedAt) {
    dates.push(incidence.resolvedAt)
  }

  if (!dates.length) {
    return incidence.createdAt
  }

  return dates.reduce((latest, current) =>
    new Date(current).getTime() >
    new Date(latest).getTime()
      ? current
      : latest,
  )
}

export default function IncidenciasPage() {
  const {
    data: incidencesData,
    error: incidencesError,
    isLoading: incidencesLoading,
    mutate: mutateIncidences,
  } = useSWR<IncidenceApiResponse[]>(
    "/api/incidences?status=all",
    fetcher,
  )

  const {
    data: institutionsData,
    error: institutionsError,
    isLoading: institutionsLoading,
  } = useSWR<Institution[]>(
    "/api/institutions",
    fetcher,
  )

  const [sections, setSections] =
    useState<SectionGeoJSON | null>(null)

  const [territoryFilter, setTerritoryFilter] =
    useState<TerritoryFilter>("all")

  const [criticalityFilter, setCriticalityFilter] =
    useState<CriticalityFilter>("all")

  const [timeFilter, setTimeFilter] =
    useState<TimeFilter>("all")

  const [customFrom, setCustomFrom] =
    useState("")

  const [customTo, setCustomTo] =
    useState("")

  const [institutionId, setInstitutionId] =
    useState("all")

  const [query, setQuery] = useState("")

  const [selectedIncidenceId, setSelectedIncidenceId] =
    useState<string | null>(null)
  const [managementUrgency, setManagementUrgency] =
    useState<"alto" | "medio" | "bajo">("medio")
  const [managementReason, setManagementReason] =
    useState("")
  const [resolutionDescription, setResolutionDescription] =
    useState("")
  const [managementError, setManagementError] =
    useState<string | null>(null)
  const [managementSaving, setManagementSaving] =
    useState(false)

  const selectedIncidence = useMemo(
    () =>
      incidencesData?.find(
        (incidence) => incidence.id === selectedIncidenceId,
      ) ?? null,
    [incidencesData, selectedIncidenceId],
  )

  const openManagement = (incidence: IncidenceApiResponse) => {
    setSelectedIncidenceId(incidence.id)
    setManagementUrgency(incidence.currentUrgency)
    setManagementReason("")
    setResolutionDescription("")
    setManagementError(null)
  }

  const closeManagement = () => {
    if (managementSaving) return
    setSelectedIncidenceId(null)
    setManagementError(null)
  }

  const saveManagement = async (resolve = false) => {
    if (!selectedIncidence) return

    const urgencyChanged =
      managementUrgency !== selectedIncidence.currentUrgency
    const reason = managementReason.trim()
    const resolution = resolutionDescription.trim()

    if (urgencyChanged && !reason) {
      setManagementError(
        "Ingresá el motivo del cambio de situación.",
      )
      return
    }

    if (resolve && !resolution) {
      setManagementError(
        "Ingresá una descripción de la resolución.",
      )
      return
    }

    setManagementSaving(true)
    setManagementError(null)

    try {
      const response = await fetch(
        `/api/incidences/${selectedIncidence.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentUrgency: managementUrgency,
            ...(reason ? { reason } : {}),
            ...(resolve
              ? {
                  status: "resolved",
                  resolutionDescription: resolution,
                }
              : {}),
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "No se pudo actualizar la incidencia.",
        )
      }

      await mutateIncidences()
      setSelectedIncidenceId(null)
    } catch (error) {
      setManagementError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la incidencia.",
      )
    } finally {
      setManagementSaving(false)
    }
  }

  const institutions = useMemo(
    () => institutionsData ?? [],
    [institutionsData],
  )

  const incidences = useMemo<Incidence[]>(() => {
    return (incidencesData ?? []).map((item) => {
      const dimension = dimensions.find(
        (candidate) =>
          candidate.title === item.dimension.name,
      )

      const indicator = dimension?.indicators.find(
        (candidate) =>
          candidate.id === item.indicator.id ||
          candidate.title === item.indicator.name,
      )

      const urgency = item.currentUrgency

      const criticality: Criticality =
        urgency
          ? urgency === "alto"
            ? "alta"
            : urgency === "medio"
              ? "media"
              : "baja"
          : "sin-relevamiento"

      return {
        ...item,
        criticality,
        dimensionNumber: dimension?.number ?? "",
        dimensionTitle:
          dimension?.title ??
          item.dimension.name ??
          "Dimensión no disponible",
        indicatorTitle:
          indicator?.title ??
          item.indicator.name ??
          "Indicador no disponible",
        indicatorDescription:
          indicator?.description ??
          "Sin descripción disponible.",
      }
    })
  }, [incidencesData])

  const dataError =
    incidencesError instanceof Error
      ? incidencesError.message
      : institutionsError instanceof Error
        ? institutionsError.message
        : incidencesError || institutionsError
          ? "No se pudieron cargar todos los datos."
          : null

  // El GeoJSON de circuitos se mantiene como recurso independiente.
  useEffect(() => {
    const controller = new AbortController()

    const loadSections = async () => {
      try {
        const response = await fetch(
          "/data/geography/capital-secciones.geojson",
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            "No se pudieron cargar los circuitos de Capital.",
          )
        }

        const data = (await response.json()) as SectionGeoJSON

        if (!controller.signal.aborted) {
          setSections(data)
        }
      } catch (error) {
        if (controller.signal.aborted) return

        console.error(
          "Error al cargar los circuitos de Capital",
          error,
        )
      }
    }

    void loadSections()

    return () => {
      controller.abort()
    }
  }, [])


  const filteredInstitutions = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("es")

    if (!normalized) {
      return institutions
    }

    return institutions.filter(
      (institution) => {
        const searchableText = [
          institution.name,
          institution.localidad ?? "",
          institution.departamento ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("es")

        return searchableText.includes(
          normalized,
        )
      },
    )
  }, [institutions, query])

  const departmentOptions = useMemo(() => {
    const values = new Map<
      string,
      string
    >()

    for (const institution of institutions) {
      const department =
        institution.departamento?.trim()

      if (!department) {
        continue
      }

      const normalized =
        normalizeDepartmentName(
          department,
        )

      if (!values.has(normalized)) {
        values.set(
          normalized,
          department,
        )
      }
    }

    return Array.from(values.values()).sort(
      (a, b) =>
        a.localeCompare(b, "es"),
    )
  }, [institutions])

  const institutionCircuitMap = useMemo(() => {
    const result = new Map<
      string,
      number
    >()

    if (!sections) {
      return result
    }

    for (const institution of institutions) {
      if (
        normalizeDepartmentName(
          institution.departamento,
        ) !== "capital"
      ) {
        continue
      }

      if (
        institution.latitude === null ||
        institution.longitude === null
      ) {
        continue
      }

      const latitude =
        institution.latitude

      const longitude =
        institution.longitude

      const section =
        sections.features.find(
          (feature) =>
            booleanPointInPolygon(
              [longitude, latitude],
              feature as never,
            ),
        )

      const number =
        section?.properties?.NUMERO

      if (
        number === undefined ||
        number === null
      ) {
        continue
      }

      const circuitNumber =
        Number(number)

      if (
        Number.isFinite(circuitNumber)
      ) {
        result.set(
          institution.id,
          circuitNumber,
        )
      }
    }

    return result
  }, [institutions, sections])

  const selectedTerritoryLabel =
    useMemo(() => {
      if (territoryFilter === "all") {
        return "Toda la provincia"
      }

      if (
        territoryFilter.startsWith(
          "department:",
        )
      ) {
        return territoryFilter.slice(
          "department:".length,
        )
      }

      if (
        territoryFilter.startsWith(
          "circuit:",
        )
      ) {
        return `Capital — Circuito ${territoryFilter.slice(
          "circuit:".length,
        )}`
      }

      return "Toda la provincia"
    }, [territoryFilter])

  const filteredIncidences = useMemo(() => {
    const dateRange = getDateRange(
      timeFilter,
      customFrom,
      customTo,
    )

    const result = incidences.filter((incidence) => {
      const institution = institutions.find(
        (item) => item.id === incidence.institutionId,
      )

      if (!institution) {
        return false
      }

      if (
        institutionId !== "all" &&
        incidence.institutionId !== institutionId
      ) {
        return false
      }

      if (territoryFilter !== "all") {
        if (territoryFilter.startsWith("department:")) {
          const selectedDepartment =
            territoryFilter.slice("department:".length)

          if (
            normalizeDepartmentName(
              institution.departamento,
            ) !==
            normalizeDepartmentName(selectedDepartment)
          ) {
            return false
          }
        }

        if (territoryFilter.startsWith("circuit:")) {
          if (
            normalizeDepartmentName(
              institution.departamento,
            ) !== "capital"
          ) {
            return false
          }

          const selectedCircuit = Number(
            territoryFilter.slice("circuit:".length),
          )

          if (
            institutionCircuitMap.get(institution.id) !==
            selectedCircuit
          ) {
            return false
          }
        }
      }

      if (
        criticalityFilter !== "all" &&
        incidence.criticality !== criticalityFilter
      ) {
        return false
      }

      if (dateRange) {
        const referenceDate =
          incidence.evaluation.closedAt ??
          incidence.evaluation.date

        const parsed = new Date(referenceDate)

        if (Number.isNaN(parsed.getTime())) {
          return false
        }

        if (dateRange.from && parsed < dateRange.from) {
          return false
        }

        if (dateRange.to && parsed > dateRange.to) {
          return false
        }
      }

      return true
    })

    result.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "open" ? -1 : 1
      }

      if (a.status === "open") {
        const criticalityDifference =
          CRITICALITY_ORDER[a.criticality] -
          CRITICALITY_ORDER[b.criticality]

        if (criticalityDifference !== 0) {
          return criticalityDifference
        }
      }

      const dateA = new Date(
        a.evaluation.closedAt ?? a.evaluation.date,
      ).getTime()

      const dateB = new Date(
        b.evaluation.closedAt ?? b.evaluation.date,
      ).getTime()

      if (dateA !== dateB) {
        return dateB - dateA
      }

      return a.institution.name.localeCompare(
        b.institution.name,
        "es",
      )
    })

    return result
  }, [
    incidences,
    institutions,
    institutionId,
    territoryFilter,
    institutionCircuitMap,
    criticalityFilter,
    timeFilter,
    customFrom,
    customTo,
  ])


  const clearFilters = () => {
    setTerritoryFilter("all")
    setCriticalityFilter("all")
    setTimeFilter("all")
    setCustomFrom("")
    setCustomTo("")
    setInstitutionId("all")
    setQuery("")
  }

  const getInstitutionTerritory = (
    institution:
      | Institution
      | undefined,
  ) => {
    if (!institution) {
      return null
    }

    const department =
      institution.departamento?.trim()

    const locality =
      institution.localidad?.trim()

    const circuit =
      institutionCircuitMap.get(
        institution.id,
      )

    const parts: string[] = []

    if (department) {
      parts.push(department)
    }

    if (
      normalizeDepartmentName(
        department,
      ) === "capital" &&
      circuit
    ) {
      parts.push(
        `Circuito ${circuit}`,
      )
    }

    if (locality) {
      parts.push(locality)
    }

    if (!parts.length) {
      return null
    }

    return parts.join(" · ")
  }

  return (
    <main className="shell">
      <style jsx>{`
        .incidence-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .incidence-card {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr)
            minmax(0, 1fr);
          border: 1px solid #e3e0e6;
          border-left: 5px solid;
          background: #ffffff;
          min-height: 190px;
        }

        .incidence-card.is-resolved {
          background: #f3f3f2;
          opacity: 0.9;
        }

        .incidence-card.is-resolved .incidence-institution-name,
        .incidence-card.is-resolved .incidence-indicator {
          color: #52606a;
        }

        .incidence-column {
          min-width: 0;
          padding: 1.15rem 1.25rem;
        }

        .incidence-column
          + .incidence-column {
          border-left: 1px solid #e3e0e6;
        }

        .incidence-institution {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 1rem;
        }

        .incidence-result {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 0.9rem;
        }

        .incidence-territory {
          margin: 0.45rem 0 0;
          font-size: 0.82rem;
          line-height: 1.45;
          color: #52606a;
        }

        .incidence-location-line {
          display: block;
        }

        .incidence-dimension-title {
          margin: 0.75rem 0 0;
          font-size: 0.82rem;
          line-height: 1.45;
          color: #52606a;
        }

        .incidence-indicator-block {
          margin-top: 0.85rem;
        }

        .incidence-institution-name {
          display: block;
          font-size: 0.95rem;
          line-height: 1.35;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .incidence-context {
          font-size: 0.9rem;
          line-height: 1.5;
          color: #230c0f;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .incidence-context-label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.72rem;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #667077;
        }

        .incidence-indicator {
          font-size: 1rem;
          line-height: 1.35;
          font-weight: 700;
        }

        .incidence-criticality {
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          min-height: 30px;
          padding: 0.35rem 0.8rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .incidence-urgency-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
          margin-top: 0.75rem;
        }

        .incidence-urgency-box {
          display: grid;
          gap: 0.25rem;
          min-width: 0;
          padding: 0.65rem 0.75rem;
          border: 1px solid #e3e0e6;
          background: #f8f7f5;
        }

        .incidence-urgency-box.current {
          border-color: #c1b8c8;
          background: #ffffff;
        }

        .incidence-urgency-label {
          font-size: 0.68rem;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #667077;
        }

        .incidence-urgency-value {
          font-size: 0.82rem;
          line-height: 1.3;
          font-weight: 700;
          color: #230c0f;
        }

        .incidence-management {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .incidence-management-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0.45rem 0.8rem;
          border: 1px solid #230c0f;
          background: #230c0f;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }

        .incidence-management-button:hover {
          background: #3a171b;
        }

        .incidence-management-button:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .incidence-management-button:focus-visible,
        .incidence-link:focus-visible {
          outline: 2px solid #230c0f;
          outline-offset: 2px;
        }

        .incidence-resolution {
          display: grid;
          gap: 0.8rem;
          padding: 0.8rem 0;
          border-top: 1px solid #d4d1d7;
        }

        .incidence-resolution-date,
        .incidence-resolution-description {
          margin: 0.2rem 0 0;
          color: #52606a;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .incidence-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .incidence-date {
          font-size: 0.78rem;
          line-height: 1.4;
          color: #667077;
        }

        .incidence-last-modification {
          margin: 0.65rem 0 0;
          font-size: 0.76rem;
          line-height: 1.4;
          color: #667077;
        }

        .incidence-link {
          flex-shrink: 0;
          color: #230c0f;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
        }

        .incidence-link:hover {
          text-decoration: underline;
        }

        .management-panel-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
          background: rgba(35, 12, 15, 0.35);
        }

        .management-panel {
          width: min(560px, 100%);
          height: 100%;
          overflow-y: auto;
          padding: 1.5rem;
          background: #f7f6f2;
          box-shadow: -12px 0 30px rgba(35, 12, 15, 0.12);
          scrollbar-gutter: stable;
        }

        .management-panel-header {
          position: sticky;
          top: -1.5rem;
          z-index: 2;
          margin: -1.5rem -1.5rem 0;
          padding: 1.5rem;
          background: #f7f6f2;
        }

        .management-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid #d4d1d7;
        }

        .management-panel-close {
          border: 0;
          background: transparent;
          color: #230c0f;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
        }

        .management-section {
          display: grid;
          gap: 0.65rem;
          padding: 1.25rem 0;
          border-bottom: 1px solid #d4d1d7;
        }

        .management-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #667077;
        }

        .management-value {
          margin: 0;
          color: #230c0f;
          font-size: 0.95rem;
        }

        .management-status {
          display: inline-flex;
          width: fit-content;
          padding: 0.3rem 0.65rem;
          border-radius: 999px;
          background: #e3e0e6;
          color: #52606a;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .management-urgency-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.65rem;
        }

        .management-urgency-option {
          display: grid;
          gap: 0.35rem;
          padding: 0.75rem;
          border: 1px solid #d4d1d7;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
        }

        .management-urgency-option.selected {
          border-color: #230c0f;
          box-shadow: inset 0 0 0 1px #230c0f;
        }

        .management-urgency-option:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .management-urgency-dot {
          display: inline-block;
          width: 9px;
          height: 9px;
          margin-right: 0.35rem;
          border-radius: 50%;
          vertical-align: middle;
        }

        .management-history {
          display: grid;
          gap: 0.7rem;
        }

        .management-history-item {
          padding: 0.8rem;
          border-left: 3px solid #c1b8c8;
          background: #ffffff;
        }

        .management-history-meta {
          margin: 0.25rem 0 0;
          color: #667077;
          font-size: 0.78rem;
        }

        .management-history-reason {
          margin: 0.45rem 0 0;
          color: #52606a;
          font-size: 0.84rem;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .management-panel textarea {
          width: 100%;
          min-height: 100px;
          resize: vertical;
        }

        .management-error {
          margin: 0.75rem 0 0;
          padding: 0.7rem 0.8rem;
          border: 1px solid #bf1363;
          background: #fff1f6;
          color: #8f0d49;
          font-size: 0.84rem;
        }

        .management-actions {
          position: sticky;
          bottom: -1.5rem;
          z-index: 2;
          display: flex;
          justify-content: flex-end;
          gap: 0.65rem;
          flex-wrap: wrap;
          margin: 0 -1.5rem -1.5rem;
          padding: 1rem 1.5rem 1.5rem;
          background: linear-gradient(
            to bottom,
            rgba(247, 246, 242, 0),
            #f7f6f2 22%
          );
        }

        .management-actions button {
          min-height: 38px;
          padding: 0.55rem 0.9rem;
          border: 1px solid #230c0f;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }

        .management-secondary {
          background: transparent;
          color: #230c0f;
        }

        .management-primary {
          background: #230c0f;
          color: #ffffff;
        }

        .management-danger {
          background: #bf1363;
          border-color: #bf1363 !important;
          color: #ffffff;
        }

        .management-actions button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        @media (max-width: 640px) {
          .management-panel {
            padding: 1rem;
          }

          .management-panel-header {
            top: -1rem;
            margin: -1rem -1rem 0;
            padding: 1rem;
          }

          .management-actions {
            bottom: -1rem;
            margin: 0 -1rem -1rem;
            padding: 1rem 1rem 1rem;
          }

          .management-urgency-grid {
            grid-template-columns: 1fr;
          }

          .management-actions {
            flex-direction: column-reverse;
          }

          .management-actions button {
            width: 100%;
          }
        }

        @media (max-width: 900px) {
          .incidence-card {
            grid-template-columns:
              minmax(0, 1fr)
              minmax(0, 1fr);
          }

          .incidence-result {
            grid-column: 1 / -1;
            border-top: 1px solid #e3e0e6;
          }

          .incidence-column
            + .incidence-column {
            border-left: none;
          }

        }

        @media (max-width: 640px) {
          .incidence-card {
            display: flex;
            flex-direction: column;
          }

          .incidence-column {
            padding: 1rem;
          }


          .incidence-result {
            border-top: 1px solid #e3e0e6;
          }

          .incidence-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <header className="topbar">
        <div>
          <p className="eyebrow">
            Territorio
          </p>

          <h1>Incidencias</h1>

          <p className="muted">
            Situaciones relevadas por
            indicador, ordenadas por
            criticidad.
          </p>
        </div>

        <Link
          className="primary-button"
          href="/relevamientos"
        >
          Ver relevamientos
        </Link>
      </header>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              FILTROS
            </p>

            <h2>
              Consultar incidencias
            </h2>
          </div>

          <button
            type="button"
            className="text-link"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="field-grid">
          <div>
            <label htmlFor="incidencias-institution-search">
              Institución
            </label>

            <input
              id="incidencias-institution-search"
              value={query}
              onChange={(event) => {
                setQuery(
                  event.target.value,
                )

                if (
                  !event.target.value
                ) {
                  setInstitutionId("all")
                }
              }}
              placeholder="Buscar institución..."
            />

            <div className="filter-results">
              <button
                type="button"
                className={
                  institutionId === "all"
                    ? "filter-option selected"
                    : "filter-option"
                }
                onClick={() =>
                  setInstitutionId("all")
                }
              >
                Todas las instituciones
              </button>

              {query &&
                filteredInstitutions
                  .slice(0, 6)
                  .map((institution) => (
                    <button
                      key={institution.id}
                      type="button"
                      className={
                        institutionId ===
                        institution.id
                          ? "filter-option selected"
                          : "filter-option"
                      }
                      onClick={() => {
                        setInstitutionId(
                          institution.id,
                        )

                        setQuery(
                          institution.name,
                        )
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontWeight: 600,
                        }}
                      >
                        {institution.name}
                      </span>

                      <span
                        className="muted"
                        style={{
                          display: "block",
                          marginTop:
                            "0.15rem",
                          fontSize:
                            "0.78rem",
                        }}
                      >
                        {[
                          institution.localidad,
                          institution.departamento,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))}
            </div>
          </div>

          <div>
            <label htmlFor="incidencias-territory">
              Departamento / circuito
            </label>

            <select
              id="incidencias-territory"
              value={territoryFilter}
              onChange={(event) =>
                setTerritoryFilter(
                  event.target
                    .value as TerritoryFilter,
                )
              }
            >
              <option value="all">
                Toda la provincia
              </option>

              <optgroup label="Departamentos">
                {departmentOptions.map(
                  (department) => (
                    <option
                      key={department}
                      value={`department:${department}`}
                    >
                      {department}
                    </option>
                  ),
                )}
              </optgroup>

              <optgroup label="Capital — circuitos">
                {Array.from(
                  { length: 14 },
                  (_, index) => {
                    const circuit =
                      index + 1

                    return (
                      <option
                        key={circuit}
                        value={`circuit:${circuit}`}
                      >
                        Capital — Circuito{" "}
                        {circuit}
                      </option>
                    )
                  },
                )}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="incidencias-criticality">
              Criticidad
            </label>

            <select
              id="incidencias-criticality"
              value={criticalityFilter}
              onChange={(event) =>
                setCriticalityFilter(
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
            <label htmlFor="incidencias-time">
              Período de finalización
            </label>

            <select
              id="incidencias-time"
              value={timeFilter}
              onChange={(event) =>
                setTimeFilter(
                  event.target
                    .value as TimeFilter,
                )
              }
            >
              <option value="all">
                Todo el período
              </option>

              <option value="week">
                Última semana
              </option>

              <option value="month">
                Último mes
              </option>

              <option value="custom">
                Seleccionar fechas
              </option>
            </select>
          </div>
        </div>

        {timeFilter === "custom" && (
          <div className="field-grid">
            <div>
              <label htmlFor="incidencias-date-from">
                Desde
              </label>

              <input
                id="incidencias-date-from"
                type="date"
                value={customFrom}
                onChange={(event) =>
                  setCustomFrom(
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label htmlFor="incidencias-date-to">
                Hasta
              </label>

              <input
                id="incidencias-date-to"
                type="date"
                value={customTo}
                min={
                  customFrom || undefined
                }
                onChange={(event) =>
                  setCustomTo(
                    event.target.value,
                  )
                }
              />
            </div>
          </div>
        )}

        <div
          className="muted"
          style={{
            marginTop: "1rem",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <span>
            Territorio:{" "}
            <strong>
              {selectedTerritoryLabel}
            </strong>
          </span>

          <span>
            {filteredIncidences.length}{" "}
            incidencia
            {filteredIncidences.length === 1
              ? ""
              : "s"}
          </span>
        </div>
      </section>

      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              RESULTADOS
            </p>

            <h2>
              {filteredIncidences.length}{" "}
              incidencia
              {filteredIncidences.length === 1
                ? ""
                : "s"}
            </h2>
          </div>

          <span className="muted">
            Abiertas → Resueltas
          </span>
        </div>

        {incidencesLoading || institutionsLoading ? (
          <p className="muted">
            Cargando incidencias...
          </p>
        ) : dataError ? (
          <p>
            {dataError}
          </p>
        ) : filteredIncidences.length === 0 ? (
          <p className="muted">
            No hay incidencias que
            coincidan con los filtros
            seleccionados.
          </p>
        ) : (
          <div className="incidence-list">
            {filteredIncidences.map(
              (incidence) => {
                const {
                  response,
                  institution,
                  criticality,
                  dimensionNumber,
                  dimensionTitle,
                  indicatorTitle,
                  status,
                  currentUrgency,
                } = incidence

                const context =
                  getResponseContext(
                    response,
                  )

                const isResolved =
                  status === "resolved"

                const territory =
                  getInstitutionTerritory(
                    institutions.find(
                      (item) =>
                        item.id === incidence.institutionId,
                    ),
                  )

                const criticalityColor =
                  CRITICALITY_COLORS[
                    criticality
                  ]

                const urgencyLabels = {
                  alto: "Alta",
                  medio: "Media",
                  bajo: "Baja",
                } as const

                const originalUrgencyLabel =
                  response.urgency
                    ? urgencyLabels[response.urgency]
                    : "No registrada"

                const currentUrgencyLabel =
                  urgencyLabels[currentUrgency]

                return (
                  <article
                    className={`incidence-card ${
                      isResolved ? "is-resolved" : ""
                    }`}
                    key={incidence.id}
                    style={{
                      borderLeftColor: isResolved
                        ? "#9aa0a6"
                        : criticalityColor,
                    }}
                  >
                    {/* =====================================================
                        1. DATOS INSTITUCIONALES
                    ====================================================== */}
                    <div className="incidence-column incidence-institution">
                      <div>
                        <span className="incidence-context-label">
                          Institución
                        </span>

                        <strong className="incidence-institution-name">
                          {institution?.name ??
                            "Institución no encontrada"}
                        </strong>

                        <p className="incidence-territory">
                          {institution?.departamento ??
                            "Departamento no disponible"}
                          {institution?.localidad
                            ? ` · ${institution.localidad}`
                            : ""}
                        </p>
                      </div>

                      <div>
                        <span className="incidence-context-label">
                          Dimensión
                        </span>

                        <p className="incidence-dimension-title">
                          Dimensión {dimensionNumber} · {dimensionTitle}
                        </p>

                        <div className="incidence-indicator-block">
                          <span className="incidence-context-label">
                            Indicador
                          </span>

                          <strong className="incidence-indicator">
                            {indicatorTitle}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* =====================================================
                        2. CONTEXTO
                    ====================================================== */}
                    <div className="incidence-column incidence-context-column">
                      <span className="incidence-context-label">
                        Contexto
                      </span>

                      {(() => {
                        const managementContext =
                          getManagementContext(incidence)

                        return managementContext.length > 0 ? (
                          <div>
                            {managementContext.map((item, index) => (
                              <p
                                className="incidence-context"
                                key={`${incidence.evaluationResponseId}-management-context-${index}`}
                                style={{
                                  margin: index === 0 ? 0 : "0.45rem 0 0",
                                }}
                              >
                                {item}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p
                            className="muted"
                            style={{ margin: 0 }}
                          >
                            Sin información registrada.
                          </p>
                        )
                      })()}
                    </div>

                    {/* =====================================================
                        3. ESTADO Y GESTIÓN
                    ====================================================== */}
                    <div className="incidence-column incidence-result">
                      <div>
                        <span className="incidence-context-label">
                          Estado original
                        </span>

                        <div className="incidence-urgency-grid">
                          <div className="incidence-urgency-box">
                            <span className="incidence-urgency-label">
                              Original
                            </span>
                            <span className="incidence-urgency-value">
                              {originalUrgencyLabel}
                            </span>
                          </div>

                          <div className="incidence-urgency-box current">
                            <span className="incidence-urgency-label">
                              Situación actual
                            </span>
                            <span className="incidence-urgency-value">
                              {currentUrgencyLabel}
                            </span>
                          </div>
                        </div>

                        <p className="incidence-last-modification">
                          Última modificación: {formatDate(
                            getLastModificationDate(incidence),
                          )}
                        </p>
                      </div>

                      <div className="incidence-management">
                        {!isResolved ? (
                          <button
                            type="button"
                            className="incidence-management-button"
                            onClick={() => openManagement(incidence)}
                          >
                            Gestionar incidencia →
                          </button>
                        ) : (
                          <span
                            className="incidence-criticality is-resolved"
                            style={{
                              backgroundColor: "#e3e0e6",
                              color: "#52606a",
                            }}
                          >
                            Resuelta
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>

      {selectedIncidence && (
        <div
          className="management-panel-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeManagement()
            }
          }}
        >
          <aside
            className="management-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="management-panel-title"
          >
            <div className="management-panel-header">
              <div>
                <p className="eyebrow">GESTIÓN DE INCIDENCIA</p>
                <h2 id="management-panel-title">
                  {selectedIncidence.institution.name}
                </h2>
                <p className="muted">
                  {selectedIncidence.indicator.name ?? "Indicador no disponible"}
                </p>
              </div>
              <button
                type="button"
                className="management-panel-close"
                onClick={closeManagement}
                disabled={managementSaving}
                aria-label="Cerrar gestión"
              >
                ×
              </button>
            </div>

            <section className="management-section">
              <span className="management-label">Estado</span>
              <span className="management-status">
                {selectedIncidence.status === "resolved" ? "Resuelta" : "Abierta"}
              </span>
            </section>

            <section className="management-section">
              <span className="management-label">Urgencia original</span>
              <p className="management-value">
                {selectedIncidence.response.urgency
                  ? URGENCY_LABELS[selectedIncidence.response.urgency]
                  : "No registrada"}
              </p>
              <span className="muted">
                Corresponde a la valoración registrada en el relevamiento original.
              </span>
            </section>

            <section className="management-section">
              <span className="management-label">Situación actual</span>
              <div className="management-urgency-grid">
                {(Object.keys(URGENCY_LABELS) as Array<"alto" | "medio" | "bajo">).map((urgency) => (
                  <button
                    key={urgency}
                    type="button"
                    className={`management-urgency-option ${managementUrgency === urgency ? "selected" : ""}`}
                    onClick={() => setManagementUrgency(urgency)}
                    disabled={managementSaving}
                  >
                    <span>
                      <span
                        className="management-urgency-dot"
                        style={{ backgroundColor: URGENCY_COLORS[urgency] }}
                      />
                      {URGENCY_LABELS[urgency]}
                    </span>
                  </button>
                ))}
              </div>

              <label htmlFor="management-reason">Motivo del cambio</label>
              <textarea
                id="management-reason"
                value={managementReason}
                onChange={(event) => setManagementReason(event.target.value)}
                placeholder="Describí qué cambió en la situación..."
                disabled={managementSaving}
              />
            </section>

            <section className="management-section">
              <span className="management-label">Historial de cambios</span>
              {selectedIncidence.urgencyHistory.length === 0 ? (
                <p className="muted">No hay cambios registrados todavía.</p>
              ) : (
                <div className="management-history">
                  {selectedIncidence.urgencyHistory.slice().reverse().map((change) => (
                    <div className="management-history-item" key={change.id}>
                      <strong>
                        {change.previousUrgency
                          ? `${URGENCY_LABELS[change.previousUrgency]} → ${URGENCY_LABELS[change.newUrgency]}`
                          : `Situación inicial: ${URGENCY_LABELS[change.newUrgency]}`}
                      </strong>
                      <p className="management-history-meta">
                        {formatDate(change.changedAt)} · {change.changedBy}
                      </p>
                      {change.reason && (
                        <p className="management-history-reason">{change.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="management-section">
              <span className="management-label">Resolución</span>
              <label htmlFor="management-resolution">Descripción de la resolución</label>
              <textarea
                id="management-resolution"
                value={resolutionDescription}
                onChange={(event) => setResolutionDescription(event.target.value)}
                placeholder="Describí las acciones realizadas y la situación alcanzada..."
                disabled={managementSaving}
              />
            </section>

            {managementError && (
              <p className="management-error" role="alert">{managementError}</p>
            )}

            <div className="management-actions">
              <button
                type="button"
                className="management-secondary"
                onClick={closeManagement}
                disabled={managementSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="management-primary"
                onClick={() => void saveManagement(false)}
                disabled={
                  managementSaving ||
                  managementUrgency === selectedIncidence.currentUrgency
                }
              >
                {managementSaving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                className="management-danger"
                onClick={() => void saveManagement(true)}
                disabled={managementSaving}
              >
                {managementSaving ? "Procesando..." : "Resolver incidencia"}
              </button>
            </div>
          </aside>
        </div>
      )}

    </main>
  )
}
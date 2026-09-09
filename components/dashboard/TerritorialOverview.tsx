"use client"


import { useEffect, useMemo, useState } from "react"
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon"
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

type DepartmentFeature = {
  type: "Feature"
  properties?: Record<string, unknown> | null
  geometry: unknown
}

type DepartmentGeoJSON = {
  type: "FeatureCollection"
  features: DepartmentFeature[]
}

type SectionFeature = {
  type: "Feature"
  properties?: {
    NOMBRE?: string
    NUMERO?: number
  } | null
  geometry: {
    type: "Polygon" | "MultiPolygon"
    coordinates: unknown
  }
}

type SectionGeoJSON = {
  type: "FeatureCollection"
  features: SectionFeature[]
}

function normalizeDepartmentName(
  value: string | null | undefined,
) {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^departamento\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")

  const aliases: Record<string, string> = {
    "gral san martin": "general san martin",
    "pte roque saenz pena":
      "presidente roque saenz pena",
  }

  return aliases[normalized] ?? normalized
}

function getDepartmentName(
  feature: DepartmentFeature,
) {
  const properties = feature.properties ?? {}

  const candidates = [
    properties.nombre,
    properties.name,
    properties.departamento,
    properties.nombre_departamento,
    properties.nom_depart,
    properties.dpto,
  ]

  const name = candidates.find(
    (value): value is string =>
      typeof value === "string" &&
      value.trim().length > 0,
  )

  return name ?? "Departamento"
}

function getSectionNumber(
  feature: SectionFeature,
) {
  return feature.properties?.NUMERO
}

export function TerritorialOverview({
  institutions,
  evaluations,
  loading = false,
}: TerritorialOverviewProps) {
  const [territoryFilter, setTerritoryFilter] =
    useState("todos")

  const [departments, setDepartments] =
    useState<DepartmentGeoJSON | null>(null)

  const [sections, setSections] =
    useState<SectionGeoJSON | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/geography/departamentos")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Departments request failed",
          )
        }

        return response.json() as Promise<DepartmentGeoJSON>
      })
      .then((data) => {
        if (!cancelled) {
          setDepartments(data)
        }
      })
      .catch((error) => {
        console.error(
          "Error cargando departamentos:",
          error,
        )
      })

    fetch("/data/geography/capital-secciones.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Circuits request failed",
          )
        }

        return response.json() as Promise<SectionGeoJSON>
      })
      .then((data) => {
        if (!cancelled) {
          setSections(data)
        }
      })
      .catch((error) => {
        console.error(
          "Error cargando circuitos de Capital:",
          error,
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  const departmentOptions = useMemo(() => {
    if (!departments) return []

    return departments.features
      .map(getDepartmentName)
      .filter(
        (name) =>
          normalizeDepartmentName(name) !==
          "capital",
      )
      .sort((a, b) =>
        a.localeCompare(b, "es", {
          sensitivity: "base",
        }),
      )
  }, [departments])

  const filteredInstitutions = useMemo(() => {
    if (territoryFilter === "todos") {
      return institutions
    }

    if (territoryFilter.startsWith("department:")) {
      const departmentName =
        territoryFilter.slice("department:".length)

      const normalizedSelected =
        normalizeDepartmentName(departmentName)

      return institutions.filter(
        (institution) =>
          normalizeDepartmentName(
            institution.departamento,
          ) === normalizedSelected,
      )
    }

    if (territoryFilter.startsWith("circuit:")) {
      const circuitNumber = Number(
        territoryFilter.slice("circuit:".length),
      )

      if (!sections || !Number.isFinite(circuitNumber)) {
        return []
      }

      const section = sections.features.find(
        (feature) =>
          getSectionNumber(feature) === circuitNumber,
      )

      if (!section) {
        return []
      }

      return institutions.filter((institution) => {
        if (
          normalizeDepartmentName(
            institution.departamento,
          ) !== "capital"
        ) {
          return false
        }

        if (
          institution.latitude === null ||
          institution.longitude === null
        ) {
          return false
        }

        return booleanPointInPolygon(
          [
            institution.longitude,
            institution.latitude,
          ],
          section as never,
        )
      })
    }

    return institutions
  }, [institutions, sections, territoryFilter])

  const assessments = useMemo(
    () =>
      filteredInstitutions.map(
        (institution) =>
          calculateInstitutionAssessment(
            institution.id,
            evaluations,
          ),
      ),
    [filteredInstitutions, evaluations],
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
        } as Record<Criticality, number>,
      ),
    [assessments],
  )

  const selectedLabel = useMemo(() => {
    if (territoryFilter === "todos") {
      return "Toda la provincia"
    }

    if (territoryFilter.startsWith("department:")) {
      return territoryFilter.slice(
        "department:".length,
      )
    }

    if (territoryFilter.startsWith("circuit:")) {
      return `Capital — Circuito ${territoryFilter.slice(
        "circuit:".length,
      )}`
    }

    return "Toda la provincia"
  }, [territoryFilter])

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
              SITUACIÓN TERRITORIAL
            </p>

            <h2>
              Distribución de instituciones
            </h2>
          </div>

          <span className="muted">
            {selectedLabel}
          </span>
        </div>

        <div
          className="dashboard-territory-filter"
          aria-label="Filtrar por departamento o circuito"
        >
          <label
            className="institution-filter-field"
            htmlFor="dashboard-territory-filter"
          >
            <span>Departamento</span>

            <select
              id="dashboard-territory-filter"
              value={territoryFilter}
              onChange={(event) =>
                setTerritoryFilter(event.target.value)
              }
            >
              <option value="todos">
                Toda la provincia
              </option>

              <optgroup label="Departamentos">
                <option value="department:Capital">
                  Capital
                </option>

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

              <optgroup label="Capital — Circuitos">
                {Array.from(
                  { length: 14 },
                  (_, index) => {
                    const circuit = index + 1

                    return (
                      <option
                        key={circuit}
                        value={`circuit:${circuit}`}
                      >
                        Capital — Circuito {circuit}
                      </option>
                    )
                  },
                )}
              </optgroup>
            </select>
          </label>
        </div>

        <CriticalityDonut counts={counts} />
      </section>

      <section className="dashboard-card territorial-dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              TERRITORIO
            </p>

            <h2>
              Mapa territorial
            </h2>
          </div>

          <span className="muted">
            {selectedLabel}
          </span>
        </div>

        <TerritorialMap
          institutions={filteredInstitutions}
          evaluations={evaluations}
          territoryFilter={territoryFilter}
          onTerritoryFilterChange={
            setTerritoryFilter
          }
        />

        <p className="map-note">
          Cada polígono representa un departamento.
          En Capital se muestran sus 14 circuitos.
          Al seleccionar un territorio se muestra
          su superficie geográfica completa.
        </p>
      </section>
    </>
  )
}

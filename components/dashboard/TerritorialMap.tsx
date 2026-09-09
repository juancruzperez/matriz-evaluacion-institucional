"use client"

import { useEffect, useMemo, useState } from "react"
import type { Layer } from "leaflet"
import { GeoJSON as LeafletGeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import type { Institution } from "@/types/institution"
import { calculateInstitutionAssessment, type Criticality } from "@/lib/criticality"
import type { Evaluation } from "@/types/evaluation"

type DepartmentFeature = {
  type: "Feature"
  properties?: Record<string, unknown> | null
  geometry: unknown
}

type DepartmentGeoJSON = {
  type: "FeatureCollection"
  features: DepartmentFeature[]
}

type DepartmentStats = {
  total: number
  evaluated: number
  pending: number
  counts: Record<Criticality, number>
}

const COLORS: Record<Criticality, string> = {
  alta: "#BF1363",
  media: "#FFE066",
  baja: "#43AA8B",
  "sin-relevamiento": "#EDEDF4",
}

const BORDER_COLOR = "#230C0F"

function normalizeDepartmentName(value: string | null | undefined) {
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
    "pte roque saenz pena": "presidente roque saenz pena",
  }

  return aliases[normalized] ?? normalized
}

function getDepartmentName(feature: DepartmentFeature) {
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
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  )

  return name ?? "Departamento"
}

function getDepartmentColor(stats: DepartmentStats | undefined) {
  if (!stats || stats.evaluated === 0) return COLORS["sin-relevamiento"]

  const score =
    (stats.counts.alta * 3 + stats.counts.media * 2 + stats.counts.baja) /
    (stats.evaluated * 3)

  if (score >= 0.66) return COLORS.alta
  if (score >= 0.33) return COLORS.media
  return COLORS.baja
}

function FitProvince() {
  const map = useMap()

  useEffect(() => {
    map.setView([-32.1, -64.2], 7.2)
  }, [map])

  return null
}

export function TerritorialMap({
  institutions,
  evaluations,
}: {
  institutions: Institution[]
  evaluations: Evaluation[]
}) {
  const [departments, setDepartments] = useState<DepartmentGeoJSON | null>(null)
  const [geographyError, setGeographyError] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch("/api/geography/departamentos")
      .then((response) => {
        if (!response.ok) throw new Error("Geography request failed")
        return response.json() as Promise<DepartmentGeoJSON>
      })
      .then((data) => {
        if (!cancelled) setDepartments(data)
      })
      .catch(() => {
        if (!cancelled) setGeographyError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const assessments = useMemo(
    () =>
      institutions.map((institution) => ({
        institution,
        assessment: calculateInstitutionAssessment(institution.id, evaluations),
      })),
    [institutions, evaluations],
  )

  const departmentStats = useMemo(() => {
    const stats = new Map<string, DepartmentStats>()

    for (const { institution, assessment } of assessments) {
      const key = normalizeDepartmentName(institution.departamento)
      if (!key) continue

      const current =
        stats.get(key) ?? {
          total: 0,
          evaluated: 0,
          pending: 0,
          counts: {
            alta: 0,
            media: 0,
            baja: 0,
            "sin-relevamiento": 0,
          },
        }

      current.total += 1
      current.counts[assessment.criticality] += 1

      if (assessment.criticality === "sin-relevamiento") current.pending += 1
      else current.evaluated += 1

      stats.set(key, current)
    }

    return stats
  }, [assessments])

  const styleDepartment = (feature?: DepartmentFeature) => {
    const name = feature ? getDepartmentName(feature) : ""
    const stats = departmentStats.get(normalizeDepartmentName(name))

    return {
      color: BORDER_COLOR,
      weight: 1,
      fillColor: getDepartmentColor(stats),
      fillOpacity: stats?.evaluated ? 0.68 : 0.3,
    }
  }

  const handleDepartment = (feature: DepartmentFeature, layer: Layer) => {
    const name = getDepartmentName(feature)
    const stats = departmentStats.get(normalizeDepartmentName(name))

    layer.bindPopup(
      stats
        ? `<div class="map-popup"><strong>${name}</strong><p>${stats.total} instituciones</p><p>${stats.evaluated} con relevamiento</p><p>${stats.pending} pendientes</p><p>Alta: ${stats.counts.alta}</p><p>Media: ${stats.counts.media}</p><p>Baja: ${stats.counts.baja}</p></div>`
        : `<div class="map-popup"><strong>${name}</strong><p>Sin instituciones asociadas.</p></div>`,
    )
  }

  return (
    <div className="territorial-map">
      <MapContainer
        center={[-32.1, -64.2]}
        zoom={7.2}
        scrollWheelZoom={false}
        className="territorial-map-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitProvince />

        {departments && (
          <LeafletGeoJSON
            data={departments as never}
            style={(feature) => styleDepartment(feature as DepartmentFeature)}
            onEachFeature={(feature, layer) =>
              handleDepartment(feature as DepartmentFeature, layer)
            }
          />
        )}
      </MapContainer>

      {!departments && !geographyError && (
        <p className="map-note">Cargando límites departamentales...</p>
      )}

      {geographyError && (
        <p className="map-note">No se pudieron cargar los límites departamentales.</p>
      )}
    </div>
  )
}

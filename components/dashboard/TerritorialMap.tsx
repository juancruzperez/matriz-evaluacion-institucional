"use client"

import { useEffect, useMemo } from "react"
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { institutionCoordinates } from "@/data/institution-coordinates"
import { institutions } from "@/data/institutions"
import {
  calculateInstitutionAssessment,
  type Criticality,
} from "@/lib/criticality"
import type { Evaluation } from "@/types/evaluation"

const COLORS: Record<Criticality, string> = {
  alta: "#BF1363",
  media: "#FFE066",
  baja: "#43AA8B",
  "sin-relevamiento": "#EDEDF4",
}

/*
 * Se calcula fuera del render para mantener el componente puro.
 * La diferencia en días no necesita precisión de horas.
 */
const TODAY_MS = new Date().setHours(0, 0, 0, 0)

function daysSince(date: string): number {
  const dateMs = new Date(`${date}T00:00:00`).getTime()

  return Math.max(
    0,
    Math.floor((TODAY_MS - dateMs) / 86400000),
  )
}

function FitBounds({
  points,
}: {
  points: Array<[number, number]>
}) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, {
        padding: [28, 28],
      })
    }
  }, [map, points])

  return null
}

function PopupSummary({
  institution,
  assessment,
  evaluations,
}: {
  institution: (typeof institutions)[number]
  assessment: ReturnType<typeof calculateInstitutionAssessment>
  evaluations: Evaluation[]
}) {
  const latest = [...evaluations].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.version - a.version,
  )[0]

  return (
    <div className="map-popup">
      <strong>{institution.name}</strong>

      <span
        className={`criticality-badge ${assessment.criticality}`}
      >
        {assessment.criticality === "sin-relevamiento"
          ? "Pendiente de evaluación"
          : `Criticidad ${assessment.criticality}`}
      </span>

      <p>
        {assessment.lastDate
          ? `Último relevamiento: hace ${daysSince(
              assessment.lastDate,
            )} días`
          : "Nunca relevada"}
      </p>

      <p>
        {assessment.evaluationCount}{" "}
        {assessment.evaluationCount === 1
          ? "relevamiento"
          : "relevamientos"}
      </p>

      {latest && (
        <p>
          Último estado:{" "}
          {latest.status === "closed"
            ? "Cerrado"
            : "En curso"}
        </p>
      )}
    </div>
  )
}

export function TerritorialMap({
  evaluations,
}: {
  evaluations: Evaluation[]
}) {
  const assessments = useMemo(() => {
    return institutions
      .map((institution) => ({
        institution,

        coordinate: institutionCoordinates.find(
          (item) => item.cue === institution.cue,
        ),

        assessment: calculateInstitutionAssessment(
          institution.id,
          evaluations,
        ),

        evaluations: evaluations.filter(
          (evaluation) =>
            evaluation.institutionId === institution.id,
        ),
      }))
      .filter((item) => item.coordinate)
  }, [evaluations])

  const points = assessments.map(
    ({ coordinate }) =>
      [
        coordinate!.latitude,
        coordinate!.longitude,
      ] as [number, number],
  )

  return (
    <div className="territorial-map">
      <MapContainer
        center={[-31.413, -64.198]}
        zoom={14}
        scrollWheelZoom={false}
        className="territorial-map-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={points} />

        {assessments.map(
          ({
            institution,
            coordinate,
            assessment,
            evaluations: institutionEvaluations,
          }) => (
            <CircleMarker
              key={institution.id}
              center={[
                coordinate!.latitude,
                coordinate!.longitude,
              ]}
              radius={9}
              pathOptions={{
                color:
                  assessment.criticality === "media"
                    ? "#230C0F"
                    : COLORS[assessment.criticality],
                fillColor:
                  COLORS[assessment.criticality],
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <PopupSummary
                  institution={institution}
                  assessment={assessment}
                  evaluations={institutionEvaluations}
                />
              </Popup>
            </CircleMarker>
          ),
        )}
      </MapContainer>
    </div>
  )
}
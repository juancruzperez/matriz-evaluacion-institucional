"use client"

import { useEffect, useMemo, useState } from "react"
import type { Layer } from "leaflet"
import {
  divIcon,
  geoJSON as leafletGeoJSON,
} from "leaflet"
import {
  GeoJSON as LeafletGeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon"
import { pointOnFeature } from "@turf/point-on-feature"

import type { Institution } from "@/types/institution"
import {
  calculateInstitutionAssessment,
  type Criticality,
} from "@/lib/criticality"
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

type SectionStats = {
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

function getSectionName(feature: SectionFeature) {
  return String(
    feature.properties?.NOMBRE ??
      feature.properties?.NUMERO ??
      "",
  )
}

/*
 * Genera una versión exclusivamente visual del GeoJSON
 * de Capital.
 *
 * Se conserva solamente el anillo exterior de cada
 * polígono para evitar que los pequeños anillos internos
 * del archivo original aparezcan como líneas sobre el mapa.
 *
 * IMPORTANTE:
 * El GeoJSON original se sigue utilizando para la
 * asociación espacial de las instituciones.
 */
function getSectionDisplayData(
  data: SectionGeoJSON,
): SectionGeoJSON {
  return {
    type: "FeatureCollection",
    features: data.features.map((feature) => {
      if (feature.geometry.type === "Polygon") {
        const coordinates =
          feature.geometry.coordinates as unknown[][][]

        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: coordinates.slice(0, 1),
          },
        }
      }

      if (
        feature.geometry.type === "MultiPolygon"
      ) {
        const coordinates =
          feature.geometry.coordinates as unknown[][][][]

        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: coordinates.map(
              (polygon) => polygon.slice(0, 1),
            ),
          },
        }
      }

      return feature
    }),
  }
}

/*
 * Obtiene un punto que se encuentra dentro de la
 * geometría de la sección.
 *
 * Se utiliza pointOnFeature en lugar del centro del
 * bounding box, porque algunas secciones tienen formas
 * irregulares y el centro del bounding box podría quedar
 * fuera del polígono.
 */
function getSectionLabelPosition(
  feature: SectionFeature,
) {
  const point = pointOnFeature(feature as never)

  const [longitude, latitude] =
    point.geometry.coordinates

  return [latitude, longitude] as [
    number,
    number,
  ]
}

/*
 * Formato ordinal de la etiqueta.
 *
 * Ejemplos:
 * 1ª
 * 2ª
 * 3ª
 * ...
 * 14ª
 */
function getOrdinalSectionLabel(number: number) {
  return `${number}ª`
}

function getDepartmentColor(
  stats: DepartmentStats | undefined,
) {
  if (!stats || stats.evaluated === 0) {
    return COLORS["sin-relevamiento"]
  }

  const score =
    (stats.counts.alta * 3 +
      stats.counts.media * 2 +
      stats.counts.baja) /
    (stats.evaluated * 3)

  if (score >= 0.66) return COLORS.alta
  if (score >= 0.33) return COLORS.media

  return COLORS.baja
}

function getSectionColor(
  stats: SectionStats | undefined,
) {
  if (!stats || stats.evaluated === 0) {
    return COLORS["sin-relevamiento"]
  }

  const score =
    (stats.counts.alta * 3 +
      stats.counts.media * 2 +
      stats.counts.baja) /
    (stats.evaluated * 3)

  if (score >= 0.66) return COLORS.alta
  if (score >= 0.33) return COLORS.media

  return COLORS.baja
}

/*
 * Vista provincial.
 */
function FitProvince() {
  const map = useMap()

  useEffect(() => {
    map.setView([-32.1, -64.2], 7.2)
  }, [map])

  return null
}

/*
 * Vista Capital.
 *
 * Cuando se activa:
 * - cierra cualquier popup abierto;
 * - hace zoom a los 14 circuitos.
 */
function FitCapital({
  sections,
  active,
}: {
  sections: SectionGeoJSON | null
  active: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!active) return

    map.closePopup()

    if (
      !sections ||
      sections.features.length === 0
    ) {
      return
    }

    const bounds = leafletGeoJSON(
      sections as never,
    ).getBounds()

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
      })
    }
  }, [map, sections, active])

  return null
}

/*
 * Control del mapa.
 *
 * Cierra cualquier popup cuando se cambia
 * entre la vista provincial y Capital.
 */
function MapPopupController({
  showCapitalSections,
}: {
  showCapitalSections: boolean
}) {
  const map = useMap()

  useEffect(() => {
    map.closePopup()
  }, [map, showCapitalSections])

  return null
}

export function TerritorialMap({
  institutions,
  evaluations,
}: {
  institutions: Institution[]
  evaluations: Evaluation[]
}) {
  const [departments, setDepartments] =
    useState<DepartmentGeoJSON | null>(null)

  const [sections, setSections] =
    useState<SectionGeoJSON | null>(null)

  /*
   * GeoJSON derivado exclusivamente para la visualización.
   *
   * El GeoJSON original se conserva para los cálculos
   * de point-in-polygon.
   */
  const displaySections = useMemo(
    () =>
      sections
        ? getSectionDisplayData(sections)
        : null,
    [sections],
  )

  const [geographyError, setGeographyError] =
    useState(false)

  const [
    showCapitalSections,
    setShowCapitalSections,
  ] = useState(false)

  /*
   * Cargar departamentos desde IDECOR.
   */
  useEffect(() => {
    let cancelled = false

    fetch("/api/geography/departamentos")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Geography request failed",
          )
        }

        return response.json() as Promise<DepartmentGeoJSON>
      })
      .then((data) => {
        if (!cancelled) {
          setDepartments(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeographyError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * Cargar los 14 circuitos de Capital
   * desde el GeoJSON local.
   */
  useEffect(() => {
    let cancelled = false

    fetch(
      "/data/geography/capital-secciones.geojson",
    )
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

  /*
   * Evaluación de cada institución.
   */
  const assessments = useMemo(
    () =>
      institutions.map((institution) => ({
        institution,
        assessment:
          calculateInstitutionAssessment(
            institution.id,
            evaluations,
          ),
      })),
    [institutions, evaluations],
  )

  /*
   * Estadísticas por departamento.
   */
  const departmentStats = useMemo(() => {
    const stats =
      new Map<string, DepartmentStats>()

    for (const {
      institution,
      assessment,
    } of assessments) {
      const key = normalizeDepartmentName(
        institution.departamento,
      )

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
      current.counts[
        assessment.criticality
      ] += 1

      if (
        assessment.criticality ===
        "sin-relevamiento"
      ) {
        current.pending += 1
      } else {
        current.evaluated += 1
      }

      stats.set(key, current)
    }

    return stats
  }, [assessments])

  /*
   * Estadísticas por circuito de Capital.
   *
   * La institución se asocia espacialmente
   * mediante sus coordenadas geográficas.
   *
   * IMPORTANTE:
   * Se utiliza el GeoJSON original, no displaySections,
   * para mantener la precisión de la asociación espacial.
   */
  const capitalSectionStats = useMemo(() => {
    if (!sections) {
      return new Map<number, SectionStats>()
    }

    const stats =
      new Map<number, SectionStats>()

    for (const {
      institution,
      assessment,
    } of assessments) {
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

      const latitude = institution.latitude
      const longitude = institution.longitude

      const section = sections.features.find(
        (feature) =>
          booleanPointInPolygon(
            [longitude, latitude],
            feature as never,
          ),
      )

      if (!section?.properties?.NUMERO) {
        continue
      }

      const sectionNumber =
        section.properties.NUMERO

      const current =
        stats.get(sectionNumber) ?? {
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
      current.counts[
        assessment.criticality
      ] += 1

      if (
        assessment.criticality ===
        "sin-relevamiento"
      ) {
        current.pending += 1
      } else {
        current.evaluated += 1
      }

      stats.set(sectionNumber, current)
    }

    return stats
  }, [assessments, sections])

  /*
   * Diagnóstico de desarrollo.
   */
  useEffect(() => {
    if (!sections) return

    console.table(
      Array.from(
        { length: 14 },
        (_, index) => {
          const circuit = index + 1

          const stats =
            capitalSectionStats.get(
              circuit,
            )

          return {
            circuito: circuit,
            instituciones:
              stats?.total ?? 0,
            relevadas:
              stats?.evaluated ?? 0,
            pendientes:
              stats?.pending ?? 0,
            alta:
              stats?.counts.alta ?? 0,
            media:
              stats?.counts.media ?? 0,
            baja:
              stats?.counts.baja ?? 0,
          }
        },
      ),
    )
  }, [sections, capitalSectionStats])

  /*
   * Estilo de departamentos.
   */
  const styleDepartment = (
    feature?: DepartmentFeature,
  ) => {
    const name = feature
      ? getDepartmentName(feature)
      : ""

    const stats =
      departmentStats.get(
        normalizeDepartmentName(name),
      )

    return {
      color: BORDER_COLOR,
      weight: 1,
      fillColor: getDepartmentColor(stats),
      fillOpacity: stats?.evaluated
        ? 0.68
        : 0.3,
    }
  }

  /*
   * Popup de departamento.
   */
  const handleDepartment = (
    feature: DepartmentFeature,
    layer: Layer,
  ) => {
    const name = getDepartmentName(feature)

    const normalizedName =
      normalizeDepartmentName(name)

    const stats =
      departmentStats.get(normalizedName)

    /*
     * Capital tiene comportamiento especial:
     * al hacer click se ingresa directamente
     * al nivel de los 14 circuitos.
     */
    if (normalizedName === "capital") {
      layer.bindPopup(`
        <div class="map-popup">
          <strong>${name}</strong>

          ${
            stats
              ? `
                <p>${stats.total} instituciones</p>
                <p>${stats.evaluated} con relevamiento</p>
                <p>${stats.pending} pendientes</p>
                <p>Alta: ${stats.counts.alta}</p>
                <p>Media: ${stats.counts.media}</p>
                <p>Baja: ${stats.counts.baja}</p>
              `
              : "<p>Sin instituciones asociadas.</p>"
          }

          <p class="map-popup-hint">
            Explorando los 14 circuitos de Capital.
          </p>
        </div>
      `)

      layer.on("click", () => {
        layer.closePopup()
        setShowCapitalSections(true)
      })

      return
    }

    layer.bindPopup(
      stats
        ? `
          <div class="map-popup">
            <strong>${name}</strong>
            <p>${stats.total} instituciones</p>
            <p>${stats.evaluated} con relevamiento</p>
            <p>${stats.pending} pendientes</p>
            <p>Alta: ${stats.counts.alta}</p>
            <p>Media: ${stats.counts.media}</p>
            <p>Baja: ${stats.counts.baja}</p>
          </div>
        `
        : `
          <div class="map-popup">
            <strong>${name}</strong>
            <p>Sin instituciones asociadas.</p>
          </div>
        `,
    )
  }

  /*
   * Estilo de los circuitos.
   */
  const styleSection = (
    feature?: SectionFeature,
  ) => {
    const sectionNumber =
      feature?.properties?.NUMERO

    const stats = sectionNumber
      ? capitalSectionStats.get(
          sectionNumber,
        )
      : undefined

    return {
      color: BORDER_COLOR,
      weight: 1.5,
      fillColor: getSectionColor(stats),
      fillOpacity: stats?.evaluated
        ? 0.72
        : 0.35,
    }
  }

  /*
   * Popup de circuito.
   */
  const handleSection = (
    feature: SectionFeature,
    layer: Layer,
  ) => {
    const sectionNumber =
      feature.properties?.NUMERO

    const name = getSectionName(feature)

    const stats = sectionNumber
      ? capitalSectionStats.get(
          sectionNumber,
        )
      : undefined

    layer.bindPopup(
      stats
        ? `
          <div class="map-popup">
            <strong>Circuito ${name}</strong>
            <p>${stats.total} instituciones</p>
            <p>${stats.evaluated} con relevamiento</p>
            <p>${stats.pending} pendientes</p>
            <p>Alta: ${stats.counts.alta}</p>
            <p>Media: ${stats.counts.media}</p>
            <p>Baja: ${stats.counts.baja}</p>
          </div>
        `
        : `
          <div class="map-popup">
            <strong>Circuito ${name}</strong>
            <p>Sin instituciones asociadas.</p>
          </div>
        `,
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

        <MapPopupController
          showCapitalSections={
            showCapitalSections
          }
        />

        {!showCapitalSections && (
          <FitProvince />
        )}

        <FitCapital
          sections={sections}
          active={showCapitalSections}
        />

        {/*
         * Vista provincial:
         * solamente departamentos.
         */}
        {departments &&
          !showCapitalSections && (
            <LeafletGeoJSON
              data={departments as never}
              style={(feature) =>
                styleDepartment(
                  feature as DepartmentFeature,
                )
              }
              onEachFeature={(
                feature,
                layer,
              ) =>
                handleDepartment(
                  feature as DepartmentFeature,
                  layer,
                )
              }
            />
          )}

        {/*
         * Vista Capital:
         * solamente los 14 circuitos.
         */}
        {showCapitalSections &&
          displaySections && (
            <>
              <LeafletGeoJSON
                data={displaySections as never}
                style={(feature) =>
                  styleSection(
                    feature as SectionFeature,
                  )
                }
                onEachFeature={(
                  feature,
                  layer,
                ) =>
                  handleSection(
                    feature as SectionFeature,
                    layer,
                  )
                }
              />

              {/*
               * Etiquetas de los circuitos.
               *
               * Se utilizan Marker + divIcon para colocar
               * el número ordinal dentro de cada polígono.
               *
               * pointOnFeature garantiza una posición
               * dentro de la geometría visible.
               */}
              {displaySections.features.map(
                (feature) => {
                  const number =
                    feature.properties?.NUMERO

                  if (
                    typeof number !== "number"
                  ) {
                    return null
                  }

                  const position =
                    getSectionLabelPosition(
                      feature,
                    )

                  return (
                    <Marker
                      key={`circuit-label-${number}`}
                      position={position}
                      interactive={false}
                      icon={divIcon({
                        className:
                          "territorial-section-label",
                        html: `
                          <span>
                            ${getOrdinalSectionLabel(
                              number,
                            )}
                          </span>
                        `,
                        iconSize: [30, 24],
                        iconAnchor: [15, 12],
                      })}
                    />
                  )
                },
              )}
            </>
          )}
      </MapContainer>

      {/*
       * Navegación del segundo nivel.
       *
       * Se coloca a la derecha para no interferir
       * con los controles + / - de Leaflet.
       */}
      {showCapitalSections && (
        <button
          type="button"
          className="territorial-map-back"
          onClick={() => {
            setShowCapitalSections(false)
          }}
        >
          ← Volver a departamentos
        </button>
      )}

      {!departments &&
        !geographyError && (
          <p className="map-note">
            Cargando límites departamentales...
          </p>
        )}

      {geographyError && (
        <p className="map-note">
          No se pudieron cargar los límites
          departamentales.
        </p>
      )}

      {showCapitalSections &&
        !sections && (
          <p className="map-note">
            Cargando circuitos de Capital...
          </p>
        )}
    </div>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import type { Layer } from "leaflet"
import {
  divIcon,
  geoJSON as leafletGeoJSON,
} from "leaflet"
import {
  CircleMarker as LeafletCircleMarker,
  GeoJSON as LeafletGeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon"
import { pointOnFeature } from "@turf/point-on-feature"

import type { Institution } from "@/types/institution"
import {
  calculateInstitutionAssessment,
  calculateTerritorialAssessment,
  type Criticality,
  type CriticalityIncidence,
  type TerritorialAssessment,
} from "@/lib/criticality"
import type { Evaluation, Urgency } from "@/types/evaluation"

type DepartmentFeature = {
  type: "Feature"
  properties?: Record<string, unknown> | null
  geometry: unknown
}

type DepartmentGeoJSON = {
  type: "FeatureCollection"
  features: DepartmentFeature[]
}

type DepartmentStats = TerritorialAssessment

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

type SectionStats = TerritorialAssessment

type IncidenceApiResponse = {
  id: string
  institutionId: string
  evaluationId: string
  evaluationResponseId: string
  status: "open" | "resolved"
  createdAt: string
  resolvedAt: string | null
  response?: {
    urgency?: Urgency | null
  } | null
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

function getSectionName(
  feature: SectionFeature,
) {
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
 * El GeoJSON original continúa utilizándose para
 * la asociación espacial de las instituciones.
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

function getOrdinalSectionLabel(
  number: number,
) {
  return `${number}ª`
}

/*
 * El color territorial NO se calcula localmente.
 *
 * calculateTerritorialAssessment() es la única fuente
 * de verdad para la criticidad acumulada del territorio.
 */
function getTerritorialColor(
  assessment: TerritorialAssessment | undefined,
) {
  if (!assessment) {
    return COLORS["sin-relevamiento"]
  }

  return COLORS[assessment.criticality]
}

/*
 * Ajusta el mapa para mostrar completamente el
 * territorio seleccionado.
 */
function FitTerritory({
  departments,
  sections,
  territoryFilter,
}: {
  departments: DepartmentGeoJSON | null
  sections: SectionGeoJSON | null
  territoryFilter: string
}) {
  const map = useMap()

  useEffect(() => {
    map.closePopup()

    if (territoryFilter === "todos") {
      map.setView([-32.1, -64.2], 7.2)
      return
    }

    let feature:
      | DepartmentFeature
      | SectionFeature
      | undefined

    if (territoryFilter.startsWith("department:")) {
      const selectedName = territoryFilter.slice(
        "department:".length,
      )

      feature = departments?.features.find(
        (item) =>
          normalizeDepartmentName(
            getDepartmentName(item),
          ) ===
          normalizeDepartmentName(selectedName),
      )
    }

    if (territoryFilter.startsWith("circuit:")) {
      const circuitNumber = Number(
        territoryFilter.slice("circuit:".length),
      )

      feature = sections?.features.find(
        (item) =>
          item.properties?.NUMERO ===
          circuitNumber,
      )
    }

    if (!feature) return

    const bounds = leafletGeoJSON(
      feature as never,
    ).getBounds()

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
      })
    }
  }, [
    map,
    departments,
    sections,
    territoryFilter,
  ])

  return null
}

function MapPopupController({
  territoryFilter,
}: {
  territoryFilter: string
}) {
  const map = useMap()

  useEffect(() => {
    map.closePopup()
  }, [map, territoryFilter])

  return null
}

export function TerritorialMap({
  institutions,
  evaluations,
  territoryFilter = "todos",
  onTerritoryFilterChange,
}: {
  institutions: Institution[]
  evaluations: Evaluation[]
  territoryFilter?: string
  onTerritoryFilterChange?: (
    value: string,
  ) => void
}) {
  const [departments, setDepartments] =
    useState<DepartmentGeoJSON | null>(null)

  const [sections, setSections] =
    useState<SectionGeoJSON | null>(null)

  const [geographyError, setGeographyError] =
    useState(false)

  const [incidences, setIncidences] =
    useState<CriticalityIncidence[]>([])

  /*
   * GeoJSON derivado exclusivamente para la
   * visualización de Capital.
   */
  const displaySections = useMemo(
    () =>
      sections
        ? getSectionDisplayData(sections)
        : null,
    [sections],
  )

  /*
   * Cargar incidencias.
   *
   * Se utilizan todas las incidencias porque
   * calculateInstitutionAssessment() se encarga
   * de considerar solamente las que permanecen
   * abiertas para la criticidad actual.
   */
  useEffect(() => {
    let cancelled = false

    fetch("/api/incidences?status=all")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Incidences request failed",
          )
        }

        return response.json()
      })
      .then((data) => {
        if (cancelled) return

        const rows = Array.isArray(data)
          ? data
          : data?.incidences ?? []

        setIncidences(
          (rows as IncidenceApiResponse[]).map(
            (incidence) => ({
              id: incidence.id,
              institutionId:
                incidence.institutionId,
              evaluationId:
                incidence.evaluationId,
              evaluationResponseId:
                incidence.evaluationResponseId,
              status: incidence.status,
              createdAt: incidence.createdAt,
              resolvedAt:
                incidence.resolvedAt,
              urgency:
                incidence.response?.urgency ??
                null,
            }),
          ),
        )
      })
      .catch((error) => {
        console.error(
          "Error cargando incidencias:",
          error,
        )

        if (!cancelled) {
          setIncidences([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * Cargar departamentos.
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
      .catch((error) => {
        console.error(
          "Error cargando departamentos:",
          error,
        )

        if (!cancelled) {
          setGeographyError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * Cargar los 14 circuitos de Capital.
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
   * --------------------------------------------------
   * CRITICIDAD INDIVIDUAL
   * --------------------------------------------------
   *
   * Se calcula para cada institución utilizando
   * exclusivamente la función centralizada.
   *
   * La criticidad actual depende de las incidencias
   * abiertas.
   */
  const assessments = useMemo(
    () =>
      institutions.map((institution) => ({
        institution,
        assessment:
          calculateInstitutionAssessment(
            institution.id,
            evaluations,
            incidences,
          ),
      })),
    [institutions, evaluations, incidences],
  )

  /*
   * --------------------------------------------------
   * CRITICIDAD ACUMULADA POR DEPARTAMENTO
   * --------------------------------------------------
   *
   * Cada departamento obtiene su propia evaluación
   * territorial.
   *
   * calculateTerritorialAssessment:
   * - considera las instituciones contenidas;
   * - utiliza las incidencias abiertas para la
   *   criticidad actual;
   * - no diluye el score con instituciones pendientes.
   */
  const departmentStats = useMemo(() => {
    const grouped =
      new Map<string, Institution[]>()

    for (const institution of institutions) {
      const key = normalizeDepartmentName(
        institution.departamento,
      )

      if (!key) continue

      const current =
        grouped.get(key) ?? []

      current.push(institution)

      grouped.set(key, current)
    }

    const stats =
      new Map<string, DepartmentStats>()

    for (const [
      department,
      departmentInstitutions,
    ] of grouped) {
      stats.set(
        department,
        calculateTerritorialAssessment(
          departmentInstitutions,
          evaluations,
          incidences,
        ),
      )
    }

    return stats
  }, [institutions, evaluations, incidences])

  /*
   * --------------------------------------------------
   * CRITICIDAD ACUMULADA POR CIRCUITO
   * --------------------------------------------------
   *
   * Los circuitos de Capital utilizan la geometría
   * para determinar qué instituciones pertenecen
   * a cada unidad territorial.
   */
  const capitalSectionStats = useMemo(() => {
    if (!sections) {
      return new Map<number, SectionStats>()
    }

    const grouped =
      new Map<number, Institution[]>()

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

      const latitude = institution.latitude
      const longitude = institution.longitude

      if (
        latitude === null ||
        longitude === null
      ) {
        continue
      }

      const section = sections.features.find(
        (feature) =>
          booleanPointInPolygon(
            [longitude, latitude],
            feature as never,
          ),
      )

      const sectionNumber =
        section?.properties?.NUMERO

      if (
        typeof sectionNumber !== "number"
      ) {
        continue
      }

      const current =
        grouped.get(sectionNumber) ?? []

      current.push(institution)

      grouped.set(
        sectionNumber,
        current,
      )
    }

    const stats =
      new Map<number, SectionStats>()

    for (const [
      sectionNumber,
      sectionInstitutions,
    ] of grouped) {
      stats.set(
        sectionNumber,
        calculateTerritorialAssessment(
          sectionInstitutions,
          evaluations,
          incidences,
        ),
      )
    }

    return stats
  }, [
    institutions,
    evaluations,
    incidences,
    sections,
  ])

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
              stats?.totalInstitutions ?? 0,
            relevadas:
              stats?.evaluatedInstitutions ?? 0,
            pendientes:
              stats?.pendingInstitutions ?? 0,
            alta:
              stats?.high ?? 0,
            media:
              stats?.medium ?? 0,
            baja:
              stats?.low ?? 0,
            criticidad:
              stats?.criticality ??
              "sin-relevamiento",
            score:
              stats?.score ?? null,
          }
        },
      ),
    )
  }, [
    sections,
    capitalSectionStats,
  ])

  /*
   * --------------------------------------------------
   * ESTILO DE DEPARTAMENTOS
   * --------------------------------------------------
   *
   * En la vista general cada departamento representa
   * una unidad territorial y recibe su criticidad
   * acumulada.
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
      fillColor:
        getTerritorialColor(stats),
      fillOpacity:
        stats?.evaluatedInstitutions
          ? 0.68
          : 0.3,
    }
  }

  /*
   * --------------------------------------------------
   * CLICK DEPARTAMENTO
   * --------------------------------------------------
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
     * Capital conserva su navegación especial
     * hacia los 14 circuitos.
     */
    if (normalizedName === "capital") {
      layer.bindPopup(`
        <div class="map-popup">
          <strong>${name}</strong>

          ${
            stats
              ? `
                <p>${stats.totalInstitutions} instituciones</p>
                <p>${stats.evaluatedInstitutions} con relevamiento cerrado</p>
                <p>${stats.pendingInstitutions} pendientes</p>
                <p>Alta: ${stats.high}</p>
                <p>Media: ${stats.medium}</p>
                <p>Baja: ${stats.low}</p>
                <p>Criticidad territorial: ${stats.criticality}</p>
                ${
                  stats.score !== null
                    ? `<p>Score: ${stats.score.toFixed(3)}</p>`
                    : ""
                }
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

        onTerritoryFilterChange?.(
          "department:Capital",
        )
      })

      return
    }

    layer.bindPopup(
      stats
        ? `
          <div class="map-popup">
            <strong>${name}</strong>
            <p>${stats.totalInstitutions} instituciones</p>
            <p>${stats.evaluatedInstitutions} con relevamiento cerrado</p>
            <p>${stats.pendingInstitutions} pendientes</p>
            <p>Alta: ${stats.high}</p>
            <p>Media: ${stats.medium}</p>
            <p>Baja: ${stats.low}</p>
            <p>Criticidad territorial: ${stats.criticality}</p>
            ${
              stats.score !== null
                ? `<p>Score: ${stats.score.toFixed(3)}</p>`
                : ""
            }
            <p class="map-popup-hint">
              Seleccionar para ver las instituciones.
            </p>
          </div>
        `
        : `
          <div class="map-popup">
            <strong>${name}</strong>
            <p>Sin instituciones asociadas.</p>
          </div>
        `,
    )

    layer.on("click", () => {
      onTerritoryFilterChange?.(
        `department:${name}`,
      )
    })
  }

  /*
   * --------------------------------------------------
   * ESTILO DE CIRCUITOS
   * --------------------------------------------------
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
      fillColor:
        getTerritorialColor(stats),
      fillOpacity:
        stats?.evaluatedInstitutions
          ? 0.72
          : 0.35,
    }
  }

  /*
   * --------------------------------------------------
   * CLICK DE CIRCUITO
   * --------------------------------------------------
   */
  const handleSection = (
    feature: SectionFeature,
    layer: Layer,
  ) => {
    const sectionNumber =
      feature.properties?.NUMERO

    const name =
      getSectionName(feature)

    const stats = sectionNumber
      ? capitalSectionStats.get(
          sectionNumber,
        )
      : undefined

    layer.on("click", () => {
      if (
        typeof sectionNumber === "number"
      ) {
        onTerritoryFilterChange?.(
          `circuit:${sectionNumber}`,
        )
      }
    })

    layer.bindPopup(
      stats
        ? `
          <div class="map-popup">
            <strong>Circuito ${name}</strong>
            <p>${stats.totalInstitutions} instituciones</p>
            <p>${stats.evaluatedInstitutions} con relevamiento cerrado</p>
            <p>${stats.pendingInstitutions} pendientes</p>
            <p>Alta: ${stats.high}</p>
            <p>Media: ${stats.medium}</p>
            <p>Baja: ${stats.low}</p>
            <p>Criticidad territorial: ${stats.criticality}</p>
            ${
              stats.score !== null
                ? `<p>Score: ${stats.score.toFixed(3)}</p>`
                : ""
            }
            <p class="map-popup-hint">
              Seleccionar para ver las instituciones.
            </p>
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

  /*
   * --------------------------------------------------
   * INSTITUCIONES DE LA VISTA ACTUAL
   * --------------------------------------------------
   *
   * Los círculos solamente aparecen cuando estamos
   * dentro de un departamento o circuito.
   *
   * En la vista provincial NO se muestran los 5.000+
   * puntos simultáneamente.
   */
  const showInstitutionMarkers =
    territoryFilter.startsWith(
      "department:",
    ) ||
    territoryFilter.startsWith(
      "circuit:",
    )

  /*
   * Capital en department:Capital mantiene la vista
   * de circuitos y no muestra todavía los puntos
   * institucionales.
   *
   * Cuando se entra a un circuito sí se muestran
   * las instituciones.
   */
  const showCapitalSections =
    territoryFilter ===
    "department:Capital"

  const visibleInstitutionAssessments =
    useMemo(() => {
      if (!showInstitutionMarkers) {
        return []
      }

      /*
       * En Capital:
       * department:Capital = vista de circuitos.
       * circuit:N = instituciones del circuito.
       */
      if (
        territoryFilter ===
        "department:Capital"
      ) {
        return []
      }

      return assessments.filter(
        ({ institution }) => {
          if (
            territoryFilter.startsWith(
              "department:",
            )
          ) {
            const departmentName =
              territoryFilter.slice(
                "department:".length,
              )

            return (
              normalizeDepartmentName(
                institution.departamento,
              ) ===
              normalizeDepartmentName(
                departmentName,
              )
            )
          }

          if (
            territoryFilter.startsWith(
              "circuit:",
            )
          ) {
            const circuitNumber = Number(
              territoryFilter.slice(
                "circuit:".length,
              ),
            )

            if (
              !Number.isFinite(
                circuitNumber,
              ) ||
              !sections
            ) {
              return false
            }

            if (
              normalizeDepartmentName(
                institution.departamento,
              ) !== "capital"
            ) {
              return false
            }

            if (
              institution.latitude ===
                null ||
              institution.longitude ===
                null
            ) {
              return false
            }

            const section =
              sections.features.find(
                (feature) =>
                  feature.properties
                    ?.NUMERO ===
                  circuitNumber,
              )

            if (!section) {
              return false
            }

            return booleanPointInPolygon(
              [
                institution.longitude,
                institution.latitude,
              ],
              section as never,
            )
          }

          return false
        },
      )
    }, [
      assessments,
      sections,
      territoryFilter,
      showInstitutionMarkers,
    ])

  /*
   * --------------------------------------------------
   * VISTA DEL MAPA
   * --------------------------------------------------
   */
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
          territoryFilter={
            territoryFilter
          }
        />

        <FitTerritory
          departments={departments}
          sections={sections}
          territoryFilter={
            territoryFilter
          }
        />

        {/*
         * ------------------------------------------------
         * VISTA PROVINCIAL
         * ------------------------------------------------
         *
         * Cada departamento recibe el color de su
         * criticidad acumulada.
         *
         * No se dibujan instituciones individualmente.
         */}
        {departments &&
          territoryFilter ===
            "todos" && (
            <LeafletGeoJSON
              key="departments-all"
              data={
                departments as never
              }
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
         * ------------------------------------------------
         * VISTA DEPARTAMENTO
         * ------------------------------------------------
         *
         * Al entrar a un departamento:
         *
         * - se deja de utilizar el polígono como
         *   representación principal;
         * - aparecen círculos individuales;
         * - cada círculo tiene el color de la
         *   criticidad actual de esa institución.
         */}
        {departments &&
          territoryFilter.startsWith(
            "department:",
          ) &&
          territoryFilter !==
            "department:Capital" && (
            <LeafletGeoJSON
              key={`department-selected-${territoryFilter}`}
              data={
                {
                  type: "FeatureCollection",
                  features:
                    departments.features.filter(
                      (feature) =>
                        normalizeDepartmentName(
                          getDepartmentName(
                            feature,
                          ),
                        ) ===
                        normalizeDepartmentName(
                          territoryFilter.replace(
                            "department:",
                            "",
                          ),
                        ),
                    ),
                } as never
              }
              style={() => ({
                color: BORDER_COLOR,
                weight: 1,
                fillColor:
                  "#EDEDF4",
                fillOpacity: 0.08,
              })}
            />
          )}

        {/*
         * ------------------------------------------------
         * CAPITAL
         * ------------------------------------------------
         *
         * Capital continúa funcionando con sus
         * 14 circuitos territoriales.
         */}
        {sections &&
          showCapitalSections && (
            <>
              <LeafletGeoJSON
                key="capital-sections"
                data={
                  displaySections as never
                }
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
               */}
              {displaySections &&
                displaySections.features.map(
                  (feature) => {
                    const number =
                      feature.properties
                        ?.NUMERO

                    if (
                      typeof number !==
                      "number"
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
                        position={
                          position
                        }
                        interactive={
                          false
                        }
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
                          iconSize: [
                            30,
                            24,
                          ],
                          iconAnchor: [
                            15,
                            12,
                          ],
                        })}
                      />
                    )
                  },
                )}
            </>
          )}

        {/*
         * ------------------------------------------------
         * CIRCUITO SELECCIONADO
         * ------------------------------------------------
         *
         * Se muestra la superficie del circuito
         * seleccionado como referencia geográfica.
         */}
        {sections &&
          territoryFilter.startsWith(
            "circuit:",
          ) && (
            <LeafletGeoJSON
              key={`circuit-${territoryFilter}`}
              data={
                {
                  type: "FeatureCollection",
                  features:
                    displaySections?.features.filter(
                      (feature) =>
                        feature.properties
                          ?.NUMERO ===
                        Number(
                          territoryFilter.slice(
                            "circuit:".length,
                          ),
                        ),
                    ) ?? [],
                } as never
              }
              style={(feature) =>
                styleSection(
                  feature as SectionFeature,
                )
              }
            />
          )}

        {/*
         * ------------------------------------------------
         * CÍRCULOS DE INSTITUCIONES
         * ------------------------------------------------
         *
         * Cada círculo representa una institución.
         *
         * El color proviene directamente de
         * calculateInstitutionAssessment().
         */}
        {visibleInstitutionAssessments.map(
          ({
            institution,
            assessment,
          }) => {
            if (
              institution.latitude ===
                null ||
              institution.longitude ===
                null
            ) {
              return null
            }

            const fillColor =
              COLORS[
                assessment.criticality
              ]

            return (
              <LeafletCircleMarker
                key={`institution-${institution.id}`}
                center={[
                  institution.latitude,
                  institution.longitude,
                ]}
                radius={8}
                pathOptions={{
                  color:
                    assessment.criticality ===
                    "media"
                      ? BORDER_COLOR
                      : fillColor,
                  fillColor,
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>
                      {institution.name}
                    </strong>

                    <p>
                      {institution.localidad ??
                        institution.departamento ??
                        ""}
                    </p>

                    <p>
                      Criticidad:{" "}
                      {assessment.criticality}
                    </p>

                    {assessment.score !==
                      null && (
                      <p>
                        Score:{" "}
                        {assessment.score.toFixed(
                          3,
                        )}
                      </p>
                    )}

                    <p>
                      Relevamientos cerrados:{" "}
                      {
                        assessment.evaluationCount
                      }
                    </p>

                    {assessment.lastDate && (
                      <p>
                        Último relevamiento:{" "}
                        {
                          assessment.lastDate
                        }
                      </p>
                    )}

                    {assessment.indicatorCount >
                      0 && (
                      <p>
                        Indicadores con urgencia:{" "}
                        {
                          assessment.indicatorCount
                        }
                      </p>
                    )}

                    {assessment.criticality ===
                      "sin-relevamiento" && (
                      <p className="map-popup-hint">
                        Sin relevamiento
                        cerrado con criticidad
                        calculable.
                      </p>
                    )}
                  </div>
                </Popup>
              </LeafletCircleMarker>
            )
          },
        )}
      </MapContainer>

      {/*
       * Navegación dentro de Capital o de un
       * circuito individual.
       */}
      {(territoryFilter ===
        "department:Capital" ||
        territoryFilter.startsWith(
          "circuit:",
        )) && (
        <button
          type="button"
          className="territorial-map-back"
          onClick={() => {
            if (
              territoryFilter.startsWith(
                "circuit:",
              )
            ) {
              onTerritoryFilterChange?.(
                "department:Capital",
              )

              return
            }

            onTerritoryFilterChange?.(
              "todos",
            )
          }}
        >
          {territoryFilter.startsWith(
            "circuit:",
          )
            ? "← Volver a circuitos"
            : "← Volver a departamentos"}
        </button>
      )}

      {/*
       * Cuando estamos dentro de un departamento
       * distinto de Capital, también necesitamos
       * permitir regresar a la vista provincial.
       */}
      {territoryFilter.startsWith(
        "department:",
      ) &&
        territoryFilter !==
          "department:Capital" && (
          <button
            type="button"
            className="territorial-map-back"
            onClick={() =>
              onTerritoryFilterChange?.(
                "todos",
              )
            }
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

      {(territoryFilter ===
        "department:Capital" ||
        territoryFilter.startsWith(
          "circuit:",
        )) &&
        !sections && (
          <p className="map-note">
            Cargando circuitos de Capital...
          </p>
        )}
    </div>
  )
}
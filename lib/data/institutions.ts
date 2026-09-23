import { sql } from "@/lib/db"
import type { Institution } from "@/types/institution"

export type InstitutionScope = {
  roleId?: string | null
  departamento?: string | null
}

const institutionSelect = sql`
  SELECT
    i.id,
    i.cue,
    i.name,
    i.address,
    i.sector,

    -- Ubicación
    i.latitude,
    i.longitude,
    i.localidad,
    i.departamento,
    i.ambito,

    -- Contacto
    COALESCE(i.telefono, ARRAY[]::text[]) AS telefono,
    COALESCE(i.email, ARRAY[]::text[]) AS email,

    -- Directivo/a vigente
    (
      SELECT json_build_object(
        'id', d.id,
        'nombre', d.nombre,
        'desde', idv.desde,
        'hasta', idv.hasta
      )
      FROM institution_directives idv
      INNER JOIN directivos d
        ON d.id = idv.directivo_id
      WHERE idv.institution_id = i.id
        AND (
          idv.desde IS NULL
          OR idv.desde <= CURRENT_DATE
        )
        AND (
          idv.hasta IS NULL
          OR idv.hasta >= CURRENT_DATE
        )
      ORDER BY
        idv.desde DESC NULLS LAST,
        idv.hasta DESC NULLS FIRST,
        idv.id DESC
      LIMIT 1
    ) AS directivo,

    -- Oferta educativa
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', il.id,
            'institutionId', il.institution_id,
            'level', il.level,
            'empresa', il.empresa,
            'modalidad', il.modalidad,

            -- Planes de estudio correspondientes a este nivel
            'studyPlans',
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', sp.id,
                    'nombre', sp.nombre
                  )
                  ORDER BY sp.nombre
                )
                FROM institution_study_plans isp
                INNER JOIN study_plans sp
                  ON sp.id = isp.study_plan_id
                WHERE isp.institution_id = i.id
                  AND isp.institution_level_id = il.id
              ),
              '[]'::json
            )
          )
          ORDER BY il.level, il.modalidad, il.id
        )
        FROM institution_levels il
        WHERE il.institution_id = i.id
      ),
      '[]'::json
    ) AS levels

  FROM institutions i
`

export async function getInstitutions(
  scope: InstitutionScope = {},
): Promise<Institution[]> {
  const rows =
    scope.roleId === "responsable_territorial"
      ? scope.departamento
        ? await sql`
            ${institutionSelect}
            WHERE i.departamento = ${scope.departamento}
            ORDER BY i.name
          `
        : []
      : await sql`
          ${institutionSelect}
          ORDER BY i.name
        `

  return rows as Institution[]
}

export async function getInstitution(
  id: string,
  scope: InstitutionScope = {},
): Promise<Institution | null> {
  const rows =
    scope.roleId === "responsable_territorial"
      ? scope.departamento
        ? await sql`
            ${institutionSelect}
            WHERE i.id = ${id}
              AND i.departamento = ${scope.departamento}
            LIMIT 1
          `
        : []
      : await sql`
          ${institutionSelect}
          WHERE i.id = ${id}
          LIMIT 1
        `

  return (rows[0] as Institution | undefined) ?? null
}
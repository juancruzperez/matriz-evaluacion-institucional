import { sql } from "@/lib/db"
import type { Institution } from "@/types/institution"

export async function GET() {
  const rows = await sql`
    SELECT
      i.id,
      i.cue,
      i.name,
      i.address,
      i.sector,
      i.latitude,
      i.longitude,
      COALESCE(
        json_agg(
          json_build_object(
            'id', il.id,
            'institutionId', il.institution_id,
            'level', il.level,
            'empresa', il.empresa
          )
          ORDER BY il.id
        ) FILTER (WHERE il.id IS NOT NULL),
        '[]'::json
      ) AS levels
    FROM institutions i
    LEFT JOIN institution_levels il
      ON il.institution_id = i.id
    GROUP BY
      i.id,
      i.cue,
      i.name,
      i.address,
      i.sector,
      i.latitude,
      i.longitude
    ORDER BY i.name
  `

  const institutions = rows as Institution[]

  return Response.json(institutions)
}
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const [database, users, institutions, evaluations] = await Promise.all([
      sql`
        SELECT
          current_database() AS database_name,
          current_schema() AS schema_name,
          current_user AS database_user
      `,
      sql`
        SELECT
          COUNT(*)::int AS count
        FROM users
      `,
      sql`
        SELECT
          COUNT(*)::int AS count
        FROM institutions
      `,
      sql`
        SELECT
          COUNT(*)::int AS count
        FROM evaluations
      `,
    ])

    return Response.json({
      ok: true,
      database: database[0],
      counts: {
        users: users[0]?.count ?? 0,
        institutions: institutions[0]?.count ?? 0,
        evaluations: evaluations[0]?.count ?? 0,
      },
    })
  } catch (error) {
    console.error("Auth diagnostic failed", error)

    return Response.json(
      {
        ok: false,
        error: "Unable to inspect database configuration",
      },
      {
        status: 500,
      },
    )
  }
}
import { auth } from "@/auth"
import {
  getUserAuthorization,
  hasPermission,
} from "@/lib/authorization"
import { createUser } from "@/lib/users"
import { sql } from "@/lib/db"
import type { RoleId } from "@/types/role"
import type { User } from "@/types/user"

type UserRow = {
  id: string
  name: string
  email: string
  active: boolean
  role_id: RoleId
  departamento: string | null
  created_at: string
  updated_at: string
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    roleId: row.role_id,
    departamento: row.departamento,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getAdminAuthorization() {
  const session = await auth()

  if (!session?.user) {
    return {
      session: null,
      authorization: null,
    }
  }

  const authorization = await getUserAuthorization({
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    roleId: session.user.roleId,
    active: true,
    departamento:
      session.user.departamento ?? null,
    createdAt: "",
    updatedAt: "",
  })

  return {
    session,
    authorization,
  }
}

export async function GET() {
  const {
    session,
    authorization,
  } = await getAdminAuthorization()

  if (!session?.user) {
    return Response.json(
      { error: "No autenticado" },
      { status: 401 },
    )
  }

  if (
    !authorization ||
    !hasPermission(
      authorization,
      "admin:users",
    )
  ) {
    return Response.json(
      { error: "No autorizado" },
      { status: 403 },
    )
  }

  try {
    const rows = (await sql`
      SELECT
        id,
        name,
        email,
        active,
        role_id,
        departamento,
        created_at,
        updated_at
      FROM users
      ORDER BY name ASC
    `) as UserRow[]

    const users = rows.map(mapUserRow)

    return Response.json(users)
  } catch (error) {
    console.error(
      "Error al obtener usuarios",
      error,
    )

    return Response.json(
      {
        error:
          "No se pudieron obtener los usuarios.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return Response.json(
      { error: "No autenticado" },
      { status: 401 },
    )
  }

  const authorization = await getUserAuthorization({
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    roleId: session.user.roleId,
    active: true,
    departamento:
      session.user.departamento ?? null,
    createdAt: "",
    updatedAt: "",
  })

  if (
    !hasPermission(
      authorization,
      "admin:users",
    )
  ) {
    return Response.json(
      { error: "No autorizado" },
      { status: 403 },
    )
  }

  let body: {
    name?: string
    email?: string
    roleId?: RoleId
    departamento?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "Solicitud inválida." },
      { status: 400 },
    )
  }

  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const roleId = body.roleId
  const departamento =
    body.departamento?.trim() || null

  if (!name) {
    return Response.json(
      { error: "El nombre es obligatorio." },
      { status: 400 },
    )
  }

  if (!email) {
    return Response.json(
      { error: "El email es obligatorio." },
      { status: 400 },
    )
  }

  if (
    roleId !== "admin" &&
    roleId !== "responsable_territorial" &&
    roleId !== "responsable_institucional"
  ) {
    return Response.json(
      { error: "Rol inválido." },
      { status: 400 },
    )
  }

  if (
    roleId === "responsable_territorial" &&
    !departamento
  ) {
    return Response.json(
      {
        error:
          "El departamento es obligatorio para un responsable territorial.",
      },
      { status: 400 },
    )
  }

  try {
    const user = await createUser({
      name,
      email,
      roleId,
      departamento,
    })

    return Response.json(user, {
      status: 201,
    })
  } catch (error) {
    console.error(
      "Error al crear usuario",
      error,
    )

    return Response.json(
      {
        error:
          "No se pudo crear el usuario.",
      },
      { status: 500 },
    )
  }
}
import { sql } from "@/lib/db"
import type { AuthenticatedIdentity } from "@/types/auth"
import type { User } from "@/types/user"

type UserRow = {
  id: string
  name: string
  email: string
  active: boolean
  role_id: User["roleId"]
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function findUserByGoogleSubject(
  subject: string,
): Promise<User | null> {
  const rows = (await sql`
    SELECT
      id,
      name,
      email,
      active,
      role_id,
      created_at,
      updated_at
    FROM users
    WHERE google_subject = ${subject}
      AND active = true
    LIMIT 1
  `) as UserRow[]

  const row = rows[0]

  return row ? mapUserRow(row) : null
}

export async function findActiveUserByEmail(
  email: string,
): Promise<User | null> {
  const rows = (await sql`
    SELECT
      id,
      name,
      email,
      active,
      role_id,
      created_at,
      updated_at
    FROM users
    WHERE LOWER(email) = LOWER(${email})
      AND active = true
    LIMIT 1
  `) as UserRow[]

  const row = rows[0]

  return row ? mapUserRow(row) : null
}

export async function linkGoogleSubject(
  userId: string,
  subject: string,
): Promise<User | null> {
  const existingUser = await findUserByGoogleSubject(subject)

  if (existingUser && existingUser.id !== userId) {
    return null
  }

  const rows = (await sql`
    UPDATE users
    SET
      google_subject = ${subject},
      updated_at = NOW()
    WHERE id = ${userId}
      AND active = true
      AND (
        google_subject IS NULL
        OR google_subject = ${subject}
      )
    RETURNING
      id,
      name,
      email,
      active,
      role_id,
      created_at,
      updated_at
  `) as UserRow[]

  const row = rows[0]

  return row ? mapUserRow(row) : null
}
export async function findUserByIdentity(
  identity: AuthenticatedIdentity,
): Promise<User | null> {
  return findUserByGoogleSubject(identity.subject)
}

export async function resolveUserFromIdentity(
  identity: AuthenticatedIdentity,
): Promise<User | null> {
  const existingUser = await findUserByGoogleSubject(identity.subject)

  if (existingUser) {
    return existingUser
  }

  const userByEmail = await findActiveUserByEmail(identity.email)

  if (!userByEmail) {
    return null
  }

  return linkGoogleSubject(
    userByEmail.id,
    identity.subject,
  )
}
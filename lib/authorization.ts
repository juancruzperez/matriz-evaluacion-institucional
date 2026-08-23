import { sql } from "@/lib/db"
import type { Permission } from "@/types/permission"
import type { RoleId } from "@/types/role"
import type { User } from "@/types/user"

export type UserAuthorization = {
  user: User
  roleId: RoleId
  permissions: Permission[]
}

type RolePermissionRow = {
  role_id: RoleId
  permission_id: string
}

const permissionMap: Record<string, Permission> = {
  view_evaluations: "evaluation:read",
  create_evaluations: "evaluation:create",
  edit_evaluations: "evaluation:update",
  close_evaluations: "evaluation:close",
  manage_configuration: "admin:manage",
  manage_users: "admin:users",
}

export async function getUserAuthorization(
  user: User,
): Promise<UserAuthorization> {
  const rows = (await sql`
    SELECT
      rp.role_id,
      rp.permission_id
    FROM role_permissions rp
    WHERE rp.role_id = ${user.roleId}
    ORDER BY rp.permission_id
  `) as RolePermissionRow[]

  const permissions = rows
    .map((row) => permissionMap[row.permission_id])
    .filter(
      (permission): permission is Permission =>
        permission !== undefined,
    )

  return {
    user,
    roleId: user.roleId,
    permissions,
  }
}

export function hasPermission(
  authorization: UserAuthorization,
  permission: Permission,
): boolean {
  return authorization.permissions.includes(permission)
}

export function hasAnyPermission(
  authorization: UserAuthorization,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) =>
    authorization.permissions.includes(permission),
  )
}

export function hasAllPermissions(
  authorization: UserAuthorization,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) =>
    authorization.permissions.includes(permission),
  )
}
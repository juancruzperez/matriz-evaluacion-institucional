import type { Permission } from "@/types/permission"
import type { RoleId } from "@/types/role"

export const rolePermissions: Record<
  RoleId,
  Permission[]
> = {
  responsable_territorial: [
    "evaluation:read",
    "evaluation:create",
    "evaluation:update",
    "evaluation:close",
  ],

  responsable_institucional: [
    "evaluation:read",
  ],

  admin: [
    "evaluation:read",
    "evaluation:create",
    "evaluation:update",
    "evaluation:close",
    "admin:manage",
    "admin:users",
  ],
}
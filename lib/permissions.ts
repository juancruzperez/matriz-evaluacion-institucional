import type { Permission } from "@/types/permission"
import type { RoleId } from "@/types/role"

export const rolePermissions: Record<
  RoleId,
  Permission[]
> = {
  territorial: [
    "evaluation:read",
    "evaluation:create",
    "evaluation:update",
    "evaluation:close",
  ],

  institutional: [
    "evaluation:read",
  ],

  admin: [
    "evaluation:read",
    "evaluation:create",
    "evaluation:update",
    "evaluation:close",
    "admin:manage",
  ],
}
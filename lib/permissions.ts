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
  "institution:update",
],

responsable_institucional: [
  "evaluation:read",
],

admin: [
  "evaluation:read",
  "evaluation:create",
  "evaluation:update",
  "evaluation:close",
  "institution:update",
  "admin:manage",
  "admin:users",
],
}
import type { RoleId } from "@/types/role"

export type User = {
  id: string
  name: string
  email: string
  roleId: RoleId
  active: boolean
  createdAt: string
  updatedAt: string
}
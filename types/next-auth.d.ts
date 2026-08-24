import type { DefaultSession } from "next-auth"
import type { DefaultJWT } from "next-auth/jwt"

import type { Permission } from "@/types/permission"
import type { RoleId } from "@/types/role"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roleId: RoleId
      permissions: Permission[]
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    roleId: RoleId
    permissions: Permission[]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string
    roleId?: RoleId
    permissions?: Permission[]
  }
}
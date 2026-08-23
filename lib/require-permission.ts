import { auth } from "@/auth"
import type { Permission } from "@/types/permission"

export async function requirePermission(
  permission: Permission,
) {
  const session = await auth()

  if (!session?.user) {
    return {
      authorized: false as const,
      status: 401 as const,
    }
  }

  if (!session.user.permissions.includes(permission)) {
    return {
      authorized: false as const,
      status: 403 as const,
    }
  }

  return {
    authorized: true as const,
    session,
  }
}
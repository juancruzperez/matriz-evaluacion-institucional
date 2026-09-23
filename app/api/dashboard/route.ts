import { requirePermission } from "@/lib/require-permission"
import { getDashboardData } from "@/lib/data/dashboard"

export async function GET() {
  const authorization = await requirePermission(
    "evaluation:read",
  )

  if (!authorization.authorized) {
    return Response.json(
      {
        error:
          authorization.status === 401
            ? "Unauthorized"
            : "Forbidden",
      },
      {
        status: authorization.status,
      },
    )
  }

  const roleId =
    authorization.session.user.roleId

  const departamento =
    authorization.session.user.departamento

  const dashboard = await getDashboardData({
    roleId,
    departamento,
  })

  return Response.json(dashboard)
}
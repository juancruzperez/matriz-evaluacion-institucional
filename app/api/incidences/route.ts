import { requirePermission } from "@/lib/require-permission"
import {
  getIncidences,
  type IncidenceStatusFilter,
} from "@/lib/data/incidences"

function getStatus(
  value: string | null,
): IncidenceStatusFilter {
  if (
    value === "open" ||
    value === "resolved"
  ) {
    return value
  }

  return "all"
}

export async function GET(request: Request) {
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

  const { searchParams } =
    new URL(request.url)

  const status = getStatus(
    searchParams.get("status"),
  )

  const roleId =
    authorization.session.user.roleId

  const departamento =
    authorization.session.user.departamento

  const incidences = await getIncidences(
    {
      roleId,
      departamento,
    },
    status,
  )

  return Response.json(incidences)
}
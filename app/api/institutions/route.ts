import { auth } from "@/auth"
import { getInstitutions } from "@/lib/data/institutions"

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return Response.json(
      { error: "No autenticado" },
      { status: 401 },
    )
  }

  const institutions = await getInstitutions({
    roleId: session.user.roleId,
    departamento: session.user.departamento,
  })

  return Response.json(institutions)
}
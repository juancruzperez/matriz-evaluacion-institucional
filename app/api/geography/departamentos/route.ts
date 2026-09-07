import { NextResponse } from "next/server"

const IDECOR_DEPARTMENTS_URL =
  "https://idecor-ws.mapascordoba.gob.ar/geoserver/idecor/wfs/json?typeName=idecor:departamentos&request=GetFeature&service=WFS&version=1.0.0"

export const revalidate = 86400

export async function GET() {
  try {
    const response = await fetch(IDECOR_DEPARTMENTS_URL, {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudo obtener la geometría de los departamentos." },
        { status: 502 },
      )
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con IDECOR." },
      { status: 502 },
    )
  }
}

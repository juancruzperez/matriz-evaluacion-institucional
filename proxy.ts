import { NextResponse } from "next/server"
import { auth } from "@/auth"

const PUBLIC_PATHS = ["/signin"]

const PROTECTED_PATHS = [
  "/dashboard",
  "/instituciones",
  "/relevamientos",
]

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export default auth((request) => {
  const { pathname } = request.nextUrl
  const isAuthenticated = Boolean(request.auth)

  // /signin es siempre pública.
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  // La raíz se resuelve según el estado de autenticación.
  if (pathname === "/") {
    const url = request.nextUrl.clone()

    if (isAuthenticated) {
      url.pathname = "/dashboard"
    } else {
      url.pathname = "/signin"
    }

    return NextResponse.redirect(url)
  }

  // Todas las rutas internas requieren autenticación.
  if (isProtectedPath(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = "/signin"
    url.search = ""

    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/",
    "/signin",
    "/dashboard/:path*",
    "/instituciones/:path*",
    "/relevamientos/:path*",
  ],
}
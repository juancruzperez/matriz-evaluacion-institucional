"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

const menuItems = [
  { href: "/", label: "Inicio" },
  { href: "/instituciones", label: "Instituciones" },
  { href: "/relevamientos", label: "Relevamientos" },
]

export function AppHeader() {
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (pathname === "/signin") {
    return null
  }

  return (
    <header className={`app-header ${compact ? "compact" : ""}`}>
      <div className="app-header-inner">
        <Link href="/" className="app-brand" onClick={() => setOpen(false)}>
          <span>
            Sistema Integral de Acompañamiento Territorial Educativo
          </span>
        </Link>

        <div className="app-menu-wrap">
          <button
            type="button"
            className="app-menu-button"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((current) => !current)}
          >
            <span>Menú</span>

            <span
              className={`app-menu-icon ${open ? "open" : ""}`}
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
          </button>

          {open && (
            <nav className="app-menu" aria-label="Navegación principal">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
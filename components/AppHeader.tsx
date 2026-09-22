"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const menuItems = [
  {
    href: "/",
    label: "Inicio",
    icon: "home",
  },
  {
    href: "/instituciones",
    label: "Instituciones",
    icon: "account_balance",
  },
  {
    href: "/relevamientos",
    label: "Relevamientos",
    icon: "quick_reference_all",
  },
  {
    href: "/incidencias",
    label: "Incidencias",
    icon: "e911_emergency",
  },
  {
    href: "/administracion",
    label: "Administración",
    icon: "manage_accounts",
  },
]

export function AppHeader() {
  const [compact, setCompact] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > 24)
    }

    onScroll()

    window.addEventListener("scroll", onScroll, {
      passive: true,
    })

    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCollapsed(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  if (pathname === "/signin") {
    return null
  }

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    )
  }

  return (
    <>
      <header
        className={`app-header ${
          compact ? "compact" : ""
        } ${collapsed ? "collapsed" : ""}`}
      >
        <div className="app-header-brand">
          <Link href="/" className="app-brand">
            Subsecretaría de Articulación y
            Proyección Institucional
          </Link>
        </div>

        <aside
          className={`app-sidebar ${
            collapsed ? "collapsed" : ""
          }`}
          aria-label="Navegación principal"
        >
          <div className="app-sidebar-header">
            <Link
              href="/"
              className="app-sidebar-title"
            >
              <span className="app-sidebar-title-mark">
                SIATE
              </span>

              <span className="app-sidebar-title-text">
                Sistema Integral de
                Acompañamiento Territorial
                Educativo
              </span>
            </Link>

            <button
              type="button"
              className="app-sidebar-toggle"
              aria-label={
                collapsed
                  ? "Expandir menú"
                  : "Contraer menú"
              }
              aria-expanded={!collapsed}
              onClick={() =>
                setCollapsed((current) => !current)
              }
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                {collapsed ? "menu" : "chevron_left"}
              </span>
            </button>
          </div>

          <nav className="app-sidebar-nav">
            <div className="app-sidebar-section">
              {!collapsed && (
                <span className="app-sidebar-section-label">
                  Navegación
                </span>
              )}

              {menuItems.map((item) => {
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`app-sidebar-link ${
                      active ? "active" : ""
                    }`}
                    aria-current={
                      active ? "page" : undefined
                    }
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                  >
                    <span
                      className="material-symbols-outlined app-sidebar-link-icon"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>

                    <span className="app-sidebar-link-label">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="app-sidebar-footer">
            <button
              type="button"
              className="app-sidebar-logout"
              onClick={() =>
                signOut({
                  callbackUrl: "/signin",
                })
              }
              title={
                collapsed
                  ? "Cerrar sesión"
                  : undefined
              }
            >
              <span
                className="material-symbols-outlined app-sidebar-link-icon"
                aria-hidden="true"
              >
                logout
              </span>

              <span className="app-sidebar-link-label">
                Cerrar sesión
              </span>
            </button>
          </div>
        </aside>
      </header>
    </>
  )
}
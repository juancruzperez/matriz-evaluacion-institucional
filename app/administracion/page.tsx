"use client"

import { FormEvent, useEffect, useState } from "react"

const DEPARTAMENTOS = [
  "CALAMUCHITA",
  "CAPITAL",
  "COLON",
  "CRUZ DEL EJE",
  "GENERAL ROCA",
  "GENERAL SAN MARTIN",
  "ISCHILIN",
  "JUAREZ CELMAN",
  "MARCOS JUAREZ",
  "MINAS",
  "POCHO",
  "PRESIDENTE ROQUE SAENZ PEÑA",
  "PUNILLA",
  "RIO CUARTO",
  "RIO PRIMERO",
  "RIO SECO",
  "RIO SEGUNDO",
  "SAN ALBERTO",
  "SAN JAVIER",
  "SAN JUSTO",
  "SANTA MARIA",
  "SOBREMONTE",
  "TERCERO ARRIBA",
  "TOTORAL",
  "TULUMBA",
  "UNION",
]

type User = {
  id: string
  name: string
  email: string
  active: boolean
  roleId:
    | "admin"
    | "responsable_territorial"
    | "responsable_institucional"
  departamento: string | null
}

const ROLE_LABELS = {
  admin: "Administrador",
  responsable_territorial:
    "Responsable Territorial",
  responsable_institucional:
    "Responsable Institucional",
}

export default function AdministracionPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [departamento, setDepartamento] =
    useState("")

  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")

  const [loadingUsers, setLoadingUsers] =
    useState(true)
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function loadUsers() {
    setLoadingUsers(true)

    try {
      const response = await fetch(
        "/api/users",
        {
          cache: "no-store",
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "No se pudieron cargar los usuarios.",
        )
      }

      setUsers(data as User[])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los usuarios.",
      )
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitialUsers() {
      try {
        const response = await fetch(
          "/api/users",
          {
            cache: "no-store",
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ??
              "No se pudieron cargar los usuarios.",
          )
        }

        if (!cancelled) {
          setUsers(data as User[])
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los usuarios.",
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false)
        }
      }
    }

    void loadInitialUsers()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          roleId: "responsable_territorial",
          departamento,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "No se pudo crear el usuario.",
        )
      }

      setSuccess(
        `El responsable territorial ${data.name} fue creado correctamente.`,
      )

      setName("")
      setEmail("")
      setDepartamento("")

      await loadUsers()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el usuario.",
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return true
    }

    const roleLabel =
      ROLE_LABELS[user.roleId].toLowerCase()

    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      roleLabel.includes(query) ||
      user.roleId.toLowerCase().includes(query) ||
      (user.departamento
        ?.toLowerCase()
        .includes(query) ??
        false)
    )
  })

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            administración
          </p>

          <h1>
            Gestión de usuarios
          </h1>

          <p className="muted">
            Administración de usuarios y
            responsables territoriales.
          </p>
        </div>
      </header>

      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              NUEVO USUARIO
            </p>

            <h2>
              Crear responsable territorial
            </h2>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="form-grid"
        >
          <div className="form-field">
            <label htmlFor="name">
              Nombre completo
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Nombre y apellido"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="departamento">
              Departamento
            </label>

            <select
              id="departamento"
              name="departamento"
              value={departamento}
              onChange={(event) =>
                setDepartamento(
                  event.target.value,
                )
              }
              required
            >
              <option value="">
                Seleccionar departamento
              </option>

              {DEPARTAMENTOS.map(
                (departamento) => (
                  <option
                    key={departamento}
                    value={departamento}
                  >
                    {departamento}
                  </option>
                ),
              )}
            </select>
          </div>

          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="form-success"
              role="status"
            >
              {success}
            </p>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Creando..."
                : "Crear usuario"}
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              USUARIOS REGISTRADOS
            </p>

            <h2>
              Usuarios
            </h2>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="user-search">
            Buscar usuario
          </label>

          <input
            id="user-search"
            name="user-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar por nombre, email, rol o departamento"
          />
        </div>

        {!loadingUsers &&
          users.length > 0 &&
          search.trim() && (
            <p className="muted">
              {filteredUsers.length}{" "}
              {filteredUsers.length === 1
                ? "usuario encontrado"
                : "usuarios encontrados"}
            </p>
          )}

        {loadingUsers ? (
          <p className="muted">
            Cargando usuarios...
          </p>
        ) : users.length === 0 ? (
          <p className="muted">
            No hay usuarios registrados.
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="muted">
            No se encontraron usuarios para &quot;
            {search}&quot;.
          </p>
        ) : (
          <div className="saved-list">
            {filteredUsers.map((user) => (
              <div
                className="saved-item"
                key={user.id}
              >
                <div>
                  <strong>
                    {user.name}
                  </strong>

                  <span>
                    {user.email}
                  </span>
                </div>

                <div>
                  <strong>
                    {ROLE_LABELS[user.roleId]}
                  </strong>

                  <span>
                    {user.departamento ??
                      "—"}{" "}
                    ·{" "}
                    {user.active
                      ? "Activo"
                      : "Inactivo"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
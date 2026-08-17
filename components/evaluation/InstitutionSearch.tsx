"use client"

import { useMemo, useState } from "react"
import type { Institution } from "@/types/institution"

type Props = {
  institutions: Institution[]
  value: Institution | null
  onChange: (institution: Institution | null) => void
  disabled?: boolean
}

export function InstitutionSearch({
  institutions,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("es")

    if (!normalized) {
      return institutions.slice(0, 8)
    }

    return institutions
      .filter((item) => {
        const levels = item.levels
          .map((level) =>
            [level.level, level.empresa].join(" "),
          )
          .join(" ")

        return [
          item.name,
          item.cue,
          item.address,
          item.sector,
          levels,
        ]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(normalized)
      })
      .slice(0, 8)
  }, [institutions, query])

  return (
    <div className="search-field">
      <label htmlFor="institution-search">
        Institución <span>*</span>
      </label>

      <div className="search-box">
        <input
          id="institution-search"
          value={value ? value.name : query}
          placeholder="Buscar por nombre, CUE, dirección..."
          disabled={disabled}
          onFocus={() => !disabled && setOpen(true)}
          onChange={(event) => {
            onChange(null)
            setQuery(event.target.value)
            setOpen(true)
          }}
        />

        {value && !disabled && (
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              onChange(null)
              setQuery("")
              setOpen(true)
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {open && !value && !disabled && (
        <div className="search-results">
          {results.length ? (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="search-result"
                onClick={() => {
                  onChange(item)
                  setQuery("")
                  setOpen(false)
                }}
              >
                <strong>{item.name}</strong>

                <span>
                  {item.address} ·{" "}
                  {item.cue || "CUE no disponible"}
                </span>
              </button>
            ))
          ) : (
            <div className="empty-result">
              No se encontraron instituciones.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
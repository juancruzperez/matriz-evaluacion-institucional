import type { Dimension } from "@/types/dimension"

export const dimensions: Dimension[] = [
  {
    id: "administrative",
    number: "02",
    title: "Administrativa y Planta Funcional",
    objective:
      "Identificar desfasajes entre recursos asignados y necesidades reales, y medir la carga burocrática.",
  },
  {
    id: "infrastructure",
    number: "03",
    title: "Infraestructura y Servicios",
    objective:
      "Mapear criticidades edilicias y auditar el cumplimiento de proveedores tercerizados.",
  },
  {
    id: "wellbeing",
    number: "04",
    title: "Clima Institucional y Bienestar Educativo",
    objective:
      "Detectar tempranamente tensiones y evaluar el entramado comunitario.",
  },
  {
    id: "pedagogy",
    number: "05",
    title: "Pedagógica e Innovación",
    objective:
      "Evaluar el anclaje de las políticas de mejora y el liderazgo académico.",
  },
]
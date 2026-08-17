import type { Indicator } from "@/types/indicator"

export const indicators: Indicator[] = [
  {
    id: "staffing",
    dimensionId: "administrative",
    title: "Relación Matrícula vs. POF/PON",
    description:
      "¿Hay cargos docentes o preceptores faltantes o excedentes?",
    hasUrgency: true,
  },
  {
    id: "novelties",
    dimensionId: "administrative",
    title: "Gestión de Novedades (MABs/CiDi)",
    description:
      "¿Existen cuellos de botella o demoras críticas en la carga?",
    hasUrgency: true,
  },
  {
    id: "contingency",
    dimensionId: "administrative",
    title: "Asistencia Requerida",
    description:
      "¿Requieren apoyo prioritario de la Célula de Contingencia administrativa?",
    hasUrgency: true,
  },

  {
    id: "building",
    dimensionId: "infrastructure",
    title: "Condiciones Edilicias Críticas",
    description:
      "Filtraciones, baños, electricidad, gas.",
    hasUrgency: true,
  },
  {
    id: "cleaning",
    dimensionId: "infrastructure",
    title: "Servicio de Limpieza",
    description:
      "Evaluación del estado general y cumplimiento de la empresa contratada.",
    hasUrgency: true,
  },
  {
    id: "connectivity",
    dimensionId: "infrastructure",
    title: "Conectividad y Parque Tecnológico",
    description:
      "Estado del piso tecnológico y disponibilidad real de equipos.",
    hasUrgency: true,
  },

  {
    id: "aec",
    dimensionId: "wellbeing",
    title: "Acuerdos de Convivencia (AEC)",
    description:
      "¿Están actualizados y apropiados por la comunidad?",
    hasUrgency: true,
  },
  {
    id: "conflict",
    dimensionId: "wellbeing",
    title: "Conflictividad Latente",
    description:
      "Tensiones recientes entre docentes, con familias o entre estudiantes que requieran mediación.",
    hasUrgency: true,
  },
  {
    id: "community",
    dimensionId: "wellbeing",
    title: "Redes Comunitarias (CLE)",
    description:
      "Articulación actual con centros de salud, municipios o seguridad barrial.",
    hasUrgency: true,
  },

  {
    id: "innovation",
    dimensionId: "pedagogy",
    title: "Proyectos de Innovación (PIE)",
    description:
      "Iniciativas propias vigentes y su impacto en la retención escolar.",
    hasStrengths: true,
  },
  {
    id: "technology",
    dimensionId: "pedagogy",
    title: "Integración de Tecnologías Digitales",
    description:
      "¿Cómo se están utilizando pedagógicamente en el aula?",
    hasStrengths: true,
  },
  {
    id: "articulation",
    dimensionId: "pedagogy",
    title: "Articulación Inter-niveles",
    description:
      "Si aplica: transición académica de los estudiantes dentro del mismo polo o edificio.",
    hasStrengths: true,
  },
]
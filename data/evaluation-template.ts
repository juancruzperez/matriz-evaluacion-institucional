import type { Dimension } from "@/types/evaluation"

export const dimensions: Dimension[] = [
  {
    id: "administrative",
    number: "02",
    title: "Administrativa y Planta Funcional",
    objective: "Identificar desfasajes entre recursos asignados y necesidades reales, y medir la carga burocrática.",
    indicators: [
      {
        id: "staffing",
        title: "Relación Matrícula vs. POF/PON",
        description: "¿Hay cargos docentes o preceptores faltantes o excedentes?",
        hasUrgency: true,
        fields: [
          { id: "enrollment", label: "Matrícula", type: "number" },
          { id: "pofPon", label: "Cantidad de POF/PON", type: "number" },
        ],
      },
      { id: "novelties", title: "Gestión de Novedades (MABs/CiDi)", description: "¿Existen cuellos de botella o demoras críticas en la carga?", hasUrgency: true },
      { id: "contingency", title: "Asistencia Requerida", description: "¿Requieren apoyo prioritario de la Célula de Contingencia administrativa?", hasUrgency: true },
    ],
  },
  {
    id: "infrastructure",
    number: "03",
    title: "Infraestructura y Servicios",
    objective: "Mapear criticidades edilicias y auditar el cumplimiento de proveedores tercerizados.",
    indicators: [
      {
        id: "building",
        title: "Condiciones Edilicias Críticas",
        description: "Filtraciones, baños, electricidad, gas.",
        hasUrgency: true,
        fields: [
          { id: "areas", label: "Áreas comprometidas", type: "multiSelect", options: ["Filtraciones", "Baños", "Electricidad", "Gas"] },
        ],
      },
      {
        id: "cleaning",
        title: "Servicio de Limpieza",
        description: "Evaluación del estado general y cumplimiento de la empresa contratada.",
        hasUrgency: true,
        fields: [{ id: "company", label: "Empresa de limpieza", type: "text" }],
      },
      { id: "connectivity", title: "Conectividad y Parque Tecnológico", description: "Estado del piso tecnológico y disponibilidad real de equipos.", hasUrgency: true },
    ],
  },
  {
    id: "wellbeing",
    number: "04",
    title: "Clima Institucional y Bienestar Educativo",
    objective: "Detectar tempranamente tensiones y evaluar el entramado comunitario.",
    indicators: [
      {
        id: "aec",
        title: "Acuerdos de Convivencia (AEC)",
        description: "¿Están actualizados y apropiados por la comunidad?",
        hasUrgency: true,
        fields: [{ id: "approvalDate", label: "Mes y año de aprobación", type: "month" }],
      },
      { id: "conflict", title: "Conflictividad Latente", description: "Tensiones recientes entre docentes, con familias o entre estudiantes que requieran mediación.", hasUrgency: true },
      { id: "community", title: "Redes Comunitarias (CLE)", description: "Articulación actual con centros de salud, municipios o seguridad barrial.", hasUrgency: true },
    ],
  },
  {
    id: "pedagogy",
    number: "05",
    title: "Pedagógica e Innovación",
    objective: "Evaluar el anclaje de las políticas de mejora y el liderazgo académico.",
    indicators: [
      { id: "innovation", title: "Proyectos de Innovación (PIE)", description: "Iniciativas propias vigentes y su impacto en la retención escolar.", hasStrengths: true },
      { id: "technology", title: "Integración de Tecnologías Digitales", description: "¿Cómo se están utilizando pedagógicamente en el aula?", hasStrengths: true },
      { id: "articulation", title: "Articulación Inter-niveles", description: "Si aplica: transición académica de los estudiantes dentro del mismo polo o edificio.", hasStrengths: true },
    ],
  },
]

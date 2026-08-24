import type { IndicatorField } from "@/types/indicator"

export const indicatorFields: IndicatorField[] = [
  {
    id: "enrollment",
    indicatorId: "staffing",
    label: "Matrícula",
    type: "number",
  },
  {
    id: "pofPon",
    indicatorId: "staffing",
    label: "Cantidad de POF/PON",
    type: "number",
  },

  {
    id: "areas",
    indicatorId: "building",
    label: "Áreas comprometidas",
    type: "multiSelect",
    options: [
      "Filtraciones",
      "Baños",
      "Electricidad",
      "Gas",
    ],
  },

  {
    id: "company",
    indicatorId: "cleaning",
    label: "Empresa de limpieza",
    type: "text",
  },

  {
    id: "approvalDate",
    indicatorId: "aec",
    label: "Mes y año de aprobación",
    type: "month",
  },
]
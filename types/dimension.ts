import type { IndicatorWithFields } from "@/types/indicator"

export type Dimension = {
  id: string
  number: string
  title: string
  objective: string
}

export type DimensionWithIndicators = Dimension & {
  indicators: IndicatorWithFields[]
}
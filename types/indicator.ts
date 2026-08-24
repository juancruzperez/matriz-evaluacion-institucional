export type IndicatorFieldType =
  | "number"
  | "text"
  | "multiSelect"
  | "month"


export type IndicatorField = {
  id: string
  indicatorId: string
  label: string
  type: IndicatorFieldType
  options?: string[]
}


export type Indicator = {
  id: string
  dimensionId: string
  title: string
  description: string
  order: number
  required: boolean
  hasUrgency?: boolean
  hasStrengths?: boolean
}


export type IndicatorWithFields = Indicator & {
  fields: IndicatorField[]
}
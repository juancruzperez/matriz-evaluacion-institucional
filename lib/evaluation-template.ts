import type {
  Dimension,
  DimensionWithIndicators,
} from "@/types/dimension"
import type {
  Indicator,
  IndicatorField,
} from "@/types/indicator"

import { dimensions as dimensionData } from "@/data/dimensions"
import { indicators } from "@/data/indicators"
import { indicatorFields } from "@/data/indicator-fields"

export function buildEvaluationTemplate(
  dimensions: Dimension[],
  indicators: Indicator[],
  indicatorFields: IndicatorField[],
): DimensionWithIndicators[] {
  const fieldsByIndicator = new Map<
    string,
    IndicatorField[]
  >()

  for (const field of indicatorFields) {
    const fields =
      fieldsByIndicator.get(field.indicatorId) ?? []

    fields.push(field)

    fieldsByIndicator.set(
      field.indicatorId,
      fields,
    )
  }

  return dimensions.map((dimension) => ({
    ...dimension,
    indicators: indicators
      .filter(
        (indicator) =>
          indicator.dimensionId === dimension.id,
      )
      .map((indicator) => ({
        ...indicator,
        fields:
          fieldsByIndicator.get(indicator.id) ?? [],
      })),
  }))
}

export const dimensions = buildEvaluationTemplate(
  dimensionData,
  indicators,
  indicatorFields,
)
import type {
  EvaluationResponse,
} from "@/types/evaluation"

export function getEvaluationResponse(
  responses: EvaluationResponse[],
  indicatorId: string,
): EvaluationResponse | undefined {
  return responses.find(
    (response) => response.indicatorId === indicatorId,
  )
}

export function upsertEvaluationResponse(
  responses: EvaluationResponse[],
  response: EvaluationResponse,
): EvaluationResponse[] {
  const existingIndex = responses.findIndex(
    (item) =>
      item.id === response.id ||
      (
        item.evaluationId === response.evaluationId &&
        item.indicatorId === response.indicatorId
      ),
  )

  if (existingIndex === -1) {
    return [...responses, response]
  }

  return responses.map((item, index) =>
    index === existingIndex ? response : item,
  )
}

export function createEvaluationResponse(
  evaluationId: string,
  indicatorId: string,
): EvaluationResponse {
  return {
    id: crypto.randomUUID(),
    evaluationId,
    indicatorId,
    observation: "",
  }
}
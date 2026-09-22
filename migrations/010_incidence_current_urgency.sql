ALTER TABLE incidences
ADD COLUMN current_urgency TEXT NULL;

ALTER TABLE incidences
ADD CONSTRAINT incidences_current_urgency_check
CHECK (
  current_urgency IS NULL
  OR current_urgency IN ('alto', 'medio', 'bajo')
);

UPDATE incidences inc
SET current_urgency = er.urgency
FROM evaluation_responses er
WHERE er.id = inc.evaluation_response_id;

ALTER TABLE incidences
ALTER COLUMN current_urgency SET NOT NULL;
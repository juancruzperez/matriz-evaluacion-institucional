CREATE TABLE incidence_urgency_history (
  id TEXT PRIMARY KEY,
  incidence_id TEXT NOT NULL,
  previous_urgency TEXT NULL,
  new_urgency TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT NOT NULL,
  reason TEXT NULL,

  CONSTRAINT incidence_urgency_history_incidence_fk
    FOREIGN KEY (incidence_id)
    REFERENCES incidences(id)
    ON DELETE CASCADE,

  CONSTRAINT incidence_urgency_history_previous_urgency_check
    CHECK (
      previous_urgency IS NULL
      OR previous_urgency IN ('alto', 'medio', 'bajo')
    ),

  CONSTRAINT incidence_urgency_history_new_urgency_check
    CHECK (
      new_urgency IN ('alto', 'medio', 'bajo')
    )
);

CREATE INDEX incidence_urgency_history_incidence_id_idx
  ON incidence_urgency_history (incidence_id);

CREATE INDEX incidence_urgency_history_changed_at_idx
  ON incidence_urgency_history (changed_at DESC);
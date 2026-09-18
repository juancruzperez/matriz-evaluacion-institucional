BEGIN;

-- ============================================================
-- 008_incidences.sql
-- MEI - Gestión y seguimiento de incidencias
-- ============================================================

-- ============================================================
-- INCIDENCIAS
-- ============================================================

CREATE TABLE incidences (
  id TEXT PRIMARY KEY,

  evaluation_response_id TEXT NOT NULL,

  evaluation_id TEXT NOT NULL,

  institution_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'open',

  resolution_description TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  resolved_at TIMESTAMPTZ NULL,

  resolved_by TEXT NULL,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_by TEXT NOT NULL,

  CONSTRAINT incidences_status_check
    CHECK (
      status IN ('open', 'resolved')
    ),

  CONSTRAINT incidences_evaluation_response_fk
    FOREIGN KEY (evaluation_response_id)
    REFERENCES evaluation_responses (id)
    ON DELETE RESTRICT,

  CONSTRAINT incidences_evaluation_fk
    FOREIGN KEY (evaluation_id)
    REFERENCES evaluations (id)
    ON DELETE RESTRICT,

  CONSTRAINT incidences_institution_fk
    FOREIGN KEY (institution_id)
    REFERENCES institutions (id)
    ON DELETE RESTRICT,

  CONSTRAINT incidences_resolved_by_fk
    FOREIGN KEY (resolved_by)
    REFERENCES users (id)
    ON DELETE RESTRICT,

  CONSTRAINT incidences_updated_by_fk
    FOREIGN KEY (updated_by)
    REFERENCES users (id)
    ON DELETE RESTRICT,

  CONSTRAINT incidences_response_unique
    UNIQUE (evaluation_response_id),

  CONSTRAINT incidences_resolved_data_check
    CHECK (
      (
        status = 'open'
        AND resolved_at IS NULL
        AND resolved_by IS NULL
      )
      OR
      (
        status = 'resolved'
        AND resolved_at IS NOT NULL
        AND resolved_by IS NOT NULL
      )
    )
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX incidences_institution_id_idx
  ON incidences (institution_id);

CREATE INDEX incidences_evaluation_id_idx
  ON incidences (evaluation_id);

CREATE INDEX incidences_evaluation_response_id_idx
  ON incidences (evaluation_response_id);

CREATE INDEX incidences_status_idx
  ON incidences (status);

CREATE INDEX incidences_resolved_by_idx
  ON incidences (resolved_by);

CREATE INDEX incidences_created_at_idx
  ON incidences (created_at);

COMMIT;
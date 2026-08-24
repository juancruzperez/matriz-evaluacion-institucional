BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS evaluations_one_open_per_institution_idx
  ON evaluations (institution_id)
  WHERE status <> 'closed';

COMMIT;
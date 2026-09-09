-- ============================================================
-- 004_refactor_db.sql
-- Refactor de modelo institucional
--
-- PASO 2: limpieza de datos operativos
--
-- NO tocar:
--   dimensions
--   indicators
--   indicator_fields
--   roles
--   permissions
--   role_permissions
--   users
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Eliminar respuestas de evaluaciones
-- ------------------------------------------------------------

DELETE FROM evaluation_responses;

-- ------------------------------------------------------------
-- 2. Eliminar evaluaciones
-- ------------------------------------------------------------

DELETE FROM evaluations;

-- ------------------------------------------------------------
-- 3. Eliminar niveles institucionales
-- ------------------------------------------------------------

DELETE FROM institution_levels;

-- ------------------------------------------------------------
-- 4. Eliminar instituciones
-- ------------------------------------------------------------

DELETE FROM institutions;


-- ------------------------------------------------------------
-- 5. Verificación
-- ------------------------------------------------------------

DO $$
DECLARE
    institutions_count INTEGER;
    levels_count INTEGER;
    evaluations_count INTEGER;
    responses_count INTEGER;
BEGIN

    SELECT COUNT(*) INTO institutions_count
    FROM institutions;

    SELECT COUNT(*) INTO levels_count
    FROM institution_levels;

    SELECT COUNT(*) INTO evaluations_count
    FROM evaluations;

    SELECT COUNT(*) INTO responses_count
    FROM evaluation_responses;

    IF institutions_count <> 0 THEN
        RAISE EXCEPTION 'institutions no quedó vacía: % registros', institutions_count;
    END IF;

    IF levels_count <> 0 THEN
        RAISE EXCEPTION 'institution_levels no quedó vacía: % registros', levels_count;
    END IF;

    IF evaluations_count <> 0 THEN
        RAISE EXCEPTION 'evaluations no quedó vacía: % registros', evaluations_count;
    END IF;

    IF responses_count <> 0 THEN
        RAISE EXCEPTION 'evaluation_responses no quedó vacía: % registros', responses_count;
    END IF;

END $$;

-- Si todo salió bien, hacemos efectivos los cambios.
COMMIT;

-- ============================================================
-- PASO 3: refactor de institutions
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Agregar ubicación administrativa
-- ------------------------------------------------------------

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS localidad TEXT;

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS departamento TEXT;

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS ambito TEXT;

-- ------------------------------------------------------------
-- 2. Agregar teléfonos y correos electrónicos
-- ------------------------------------------------------------

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS telefono TEXT[];

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS email TEXT[];

-- ------------------------------------------------------------
-- 3. Convertir coordenadas a NUMERIC
-- ------------------------------------------------------------

ALTER TABLE institutions
    ALTER COLUMN latitude TYPE NUMERIC
    USING latitude::NUMERIC;

ALTER TABLE institutions
    ALTER COLUMN longitude TYPE NUMERIC
    USING longitude::NUMERIC;

-- ------------------------------------------------------------
-- 4. CUE pasa a ser obligatorio
-- ------------------------------------------------------------

ALTER TABLE institutions
    ALTER COLUMN cue SET NOT NULL;

-- ------------------------------------------------------------
-- 5. Un CUE identifica de forma única una unidad académica
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS institutions_cue_unique
    ON institutions (cue);

-- ------------------------------------------------------------
-- 6. Validación de valores permitidos para sector
-- ------------------------------------------------------------

ALTER TABLE institutions
    DROP CONSTRAINT IF EXISTS institutions_sector_check;

ALTER TABLE institutions
    ADD CONSTRAINT institutions_sector_check
    CHECK (sector IN ('Estatal', 'Privado'));

-- ------------------------------------------------------------
-- 7. Validación de ámbito
-- ------------------------------------------------------------

ALTER TABLE institutions
    ADD CONSTRAINT institutions_ambito_check
    CHECK (
        ambito IS NULL
        OR ambito IN (
            'Urbano',
            'Rural Disperso',
            'Rural Aglomerado'
        )
    );

COMMIT;

BEGIN;

-- ============================================================
-- PASO 3B: endurecer constraints de institutions
-- ============================================================

-- Las coordenadas son obligatorias según el dataset definitivo.
ALTER TABLE institutions
    ALTER COLUMN latitude SET NOT NULL;

ALTER TABLE institutions
    ALTER COLUMN longitude SET NOT NULL;

-- Eliminar el índice parcial anterior.
DROP INDEX IF EXISTS institutions_cue_unique;

-- CUE debe ser realmente único, sin excepciones.
CREATE UNIQUE INDEX institutions_cue_unique
    ON institutions (cue);

COMMIT;

BEGIN;

BEGIN;

-- ============================================================
-- PASO 4: agregar modalidad a institution_levels
-- ============================================================

ALTER TABLE institution_levels
    ADD COLUMN IF NOT EXISTS modalidad TEXT;

-- ============================================================
-- Nueva regla de negocio:
-- una institución no puede tener dos veces la misma
-- combinación nivel + modalidad.
--
-- Ejemplos válidos:
--   Secundario + Común
--   Secundario + Jóvenes y Adultos
--
-- Ejemplo inválido:
--   Secundario + Común
--   Secundario + Común
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    institution_levels_institution_level_modalidad_unique
ON institution_levels (
    institution_id,
    level,
    COALESCE(modalidad, '')
);

COMMIT;

BEGIN;

-- ============================================================
-- PASO 5: directivos
-- ============================================================

CREATE TABLE IF NOT EXISTS directivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Relación institución ↔ directivo
-- Permite conservar historial de cargos.
-- ============================================================

CREATE TABLE IF NOT EXISTS institution_directives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    institution_id TEXT NOT NULL,
    directivo_id UUID NOT NULL,

    desde DATE NULL,
    hasta DATE NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT institution_directives_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE CASCADE,

    CONSTRAINT institution_directives_directivo_fk
        FOREIGN KEY (directivo_id)
        REFERENCES directivos(id)
        ON DELETE RESTRICT,

    CONSTRAINT institution_directives_dates_check
        CHECK (
            hasta IS NULL
            OR desde IS NULL
            OR hasta >= desde
        )
);

-- Índices para las relaciones.
CREATE INDEX IF NOT EXISTS
    institution_directives_institution_id_idx
ON institution_directives (institution_id);

CREATE INDEX IF NOT EXISTS
    institution_directives_directivo_id_idx
ON institution_directives (directivo_id);

COMMIT;

BEGIN;

-- ============================================================
-- PASO 6: planes de estudio
-- ============================================================

CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Relación institución ↔ plan de estudio
-- ============================================================

CREATE TABLE IF NOT EXISTS institution_study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    institution_id TEXT NOT NULL,
    study_plan_id UUID NOT NULL,

    desde DATE NULL,
    hasta DATE NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT institution_study_plans_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE CASCADE,

    CONSTRAINT institution_study_plans_study_plan_fk
        FOREIGN KEY (study_plan_id)
        REFERENCES study_plans(id)
        ON DELETE RESTRICT,

    CONSTRAINT institution_study_plans_dates_check
        CHECK (
            hasta IS NULL
            OR desde IS NULL
            OR hasta >= desde
        )
);

-- Índices para las relaciones.
CREATE INDEX IF NOT EXISTS
    institution_study_plans_institution_id_idx
ON institution_study_plans (institution_id);

CREATE INDEX IF NOT EXISTS
    institution_study_plans_study_plan_id_idx
ON institution_study_plans (study_plan_id);

COMMIT;

-- ============================================================
-- PASO 7: auditoría de relaciones
-- No modifica datos.
-- ============================================================

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
      'institutions',
      'institution_levels',
      'evaluations',
      'evaluation_responses',
      'directivos',
      'institution_directives',
      'study_plans',
      'institution_study_plans'
  )
ORDER BY
    tc.table_name,
    tc.constraint_type,
    tc.constraint_name;
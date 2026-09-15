BEGIN;

-- ============================================================
-- 007_add_relevamiento_dimensions.sql
-- MEI - Nuevas dimensiones para relevamientos
-- ============================================================

-- ============================================================
-- DIMENSIONES
-- ============================================================

INSERT INTO dimensions (
  id,
  name,
  description
)
VALUES
  (
    'environment',
    'Ambiente',
    'Dimensión vinculada a las situaciones ambientales que inciden en el funcionamiento institucional y la comunidad educativa.'
  ),
  (
    'institutional-articulation',
    'Articulación Institucional',
    'Dimensión vinculada a la articulación de la institución con otros actores, organismos y niveles.'
  ),
  (
    'communications',
    'Comunicaciones',
    'Dimensión vinculada a los circuitos, canales y necesidades de comunicación institucional.'
  ),
  (
    'resources',
    'Recursos e Insumos',
    'Dimensión vinculada a la disponibilidad, suficiencia y necesidad de recursos e insumos institucionales.'
  ),
  (
    'security',
    'Seguridad',
    'Dimensión vinculada a las situaciones que pueden afectar la seguridad de las personas y el normal funcionamiento institucional.'
  );

-- ============================================================
-- INDICADORES PROVISORIOS
-- Un indicador general permite utilizar la estructura actual
-- del relevamiento hasta definir los indicadores específicos.
-- ============================================================

INSERT INTO indicators (
  id,
  dimension_id,
  title,
  description,
  has_urgency,
  has_strengths
)
VALUES
  (
    'environment-general',
    'environment',
    'Situación general',
    'Registrar la situación ambiental relevada y cualquier aspecto que requiera atención.',
    TRUE,
    FALSE
  ),
  (
    'institutional-articulation-general',
    'institutional-articulation',
    'Situación general',
    'Registrar la situación vinculada con la articulación institucional.',
    TRUE,
    FALSE
  ),
  (
    'communications-general',
    'communications',
    'Situación general',
    'Registrar la situación vinculada con las comunicaciones institucionales.',
    TRUE,
    FALSE
  ),
  (
    'resources-general',
    'resources',
    'Situación general',
    'Registrar la situación vinculada con recursos e insumos.',
    TRUE,
    FALSE
  ),
  (
    'security-general',
    'security',
    'Situación general',
    'Registrar la situación vinculada con la seguridad institucional.',
    TRUE,
    FALSE
  );

COMMIT;

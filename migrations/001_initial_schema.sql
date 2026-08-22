BEGIN;

-- ============================================================
-- 001_initial_schema.sql
-- MEI - Modelo inicial de persistencia
-- ============================================================

-- ============================================================
-- INSTITUCIONES
-- ============================================================

CREATE TABLE institutions (
  id TEXT PRIMARY KEY,
  cue TEXT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  sector TEXT NOT NULL
);

CREATE UNIQUE INDEX institutions_cue_unique
  ON institutions (cue)
  WHERE cue IS NOT NULL
    AND cue <> '';

-- ============================================================
-- NIVELES INSTITUCIONALES
-- ============================================================

CREATE TABLE institution_levels (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  level TEXT NOT NULL,
  empresa TEXT NULL,

  CONSTRAINT institution_levels_institution_fk
    FOREIGN KEY (institution_id)
    REFERENCES institutions (id)
    ON DELETE CASCADE,

  CONSTRAINT institution_levels_id_institution_unique
    UNIQUE (id, institution_id)
);

CREATE INDEX institution_levels_institution_id_idx
  ON institution_levels (institution_id);

-- ============================================================
-- DIMENSIONES
-- ============================================================

CREATE TABLE dimensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

-- ============================================================
-- INDICADORES
-- ============================================================

CREATE TABLE indicators (
  id TEXT PRIMARY KEY,
  dimension_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  has_urgency BOOLEAN NOT NULL DEFAULT FALSE,
  has_strengths BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT indicators_dimension_fk
    FOREIGN KEY (dimension_id)
    REFERENCES dimensions (id)
    ON DELETE RESTRICT
);

CREATE INDEX indicators_dimension_id_idx
  ON indicators (dimension_id);

-- ============================================================
-- CAMPOS DE INDICADORES
-- ============================================================

CREATE TABLE indicator_fields (
  id TEXT PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB NULL,

  CONSTRAINT indicator_fields_indicator_fk
    FOREIGN KEY (indicator_id)
    REFERENCES indicators (id)
    ON DELETE CASCADE,

  CONSTRAINT indicator_fields_type_check
    CHECK (
      type IN (
        'number',
        'text',
        'multiSelect',
        'month'
      )
    )
);

CREATE INDEX indicator_fields_indicator_id_idx
  ON indicator_fields (indicator_id);

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ============================================================
-- PERMISOS
-- ============================================================

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ============================================================
-- RELACIÓN ROLES / PERMISOS
-- ============================================================

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,

  PRIMARY KEY (role_id, permission_id),

  CONSTRAINT role_permissions_role_fk
    FOREIGN KEY (role_id)
    REFERENCES roles (id)
    ON DELETE CASCADE,

  CONSTRAINT role_permissions_permission_fk
    FOREIGN KEY (permission_id)
    REFERENCES permissions (id)
    ON DELETE CASCADE
);

CREATE INDEX role_permissions_permission_id_idx
  ON role_permissions (permission_id);

-- ============================================================
-- USUARIOS
-- ============================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  role_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_role_fk
    FOREIGN KEY (role_id)
    REFERENCES roles (id)
    ON DELETE RESTRICT
);

CREATE INDEX users_role_id_idx
  ON users (role_id);

-- ============================================================
-- RELEVAMIENTOS
-- ============================================================

CREATE TABLE evaluations (
  id TEXT PRIMARY KEY,

  version INTEGER NOT NULL DEFAULT 1,

  status TEXT NOT NULL DEFAULT 'draft',

  institution_id TEXT NOT NULL,

  institution_level_id TEXT NULL,

  date DATE NOT NULL,

  management_team_present BOOLEAN NULL,

  management_team_contact TEXT NOT NULL DEFAULT '',

  created_by TEXT NOT NULL,

  updated_by TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  closed_at TIMESTAMPTZ NULL,

  CONSTRAINT evaluations_status_check
    CHECK (
      status IN ('draft', 'closed')
    ),

  CONSTRAINT evaluations_version_check
    CHECK (
      version >= 1
    ),

  CONSTRAINT evaluations_institution_fk
    FOREIGN KEY (institution_id)
    REFERENCES institutions (id)
    ON DELETE RESTRICT,

  CONSTRAINT evaluations_institution_level_belongs_to_institution_fk
    FOREIGN KEY (institution_level_id, institution_id)
    REFERENCES institution_levels (id, institution_id)
    ON DELETE RESTRICT,

  CONSTRAINT evaluations_created_by_fk
    FOREIGN KEY (created_by)
    REFERENCES users (id)
    ON DELETE RESTRICT,

  CONSTRAINT evaluations_updated_by_fk
    FOREIGN KEY (updated_by)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

CREATE INDEX evaluations_institution_id_idx
  ON evaluations (institution_id);

CREATE INDEX evaluations_institution_level_id_idx
  ON evaluations (institution_level_id);

CREATE INDEX evaluations_status_idx
  ON evaluations (status);

CREATE INDEX evaluations_created_by_idx
  ON evaluations (created_by);

CREATE INDEX evaluations_updated_by_idx
  ON evaluations (updated_by);

-- ============================================================
-- RESPUESTAS DE RELEVAMIENTOS
-- ============================================================

CREATE TABLE evaluation_responses (
  id TEXT PRIMARY KEY,

  evaluation_id TEXT NOT NULL,

  indicator_id TEXT NOT NULL,

  observation TEXT NOT NULL DEFAULT '',

  urgency TEXT NULL,

  strengths TEXT NULL,

  fields JSONB NULL,

  CONSTRAINT evaluation_responses_evaluation_fk
    FOREIGN KEY (evaluation_id)
    REFERENCES evaluations (id)
    ON DELETE CASCADE,

  CONSTRAINT evaluation_responses_indicator_fk
    FOREIGN KEY (indicator_id)
    REFERENCES indicators (id)
    ON DELETE RESTRICT,

  CONSTRAINT evaluation_responses_urgency_check
    CHECK (
      urgency IS NULL
      OR urgency IN ('alto', 'medio', 'bajo')
    ),

  CONSTRAINT evaluation_responses_unique_indicator
    UNIQUE (evaluation_id, indicator_id)
);

CREATE INDEX evaluation_responses_evaluation_id_idx
  ON evaluation_responses (evaluation_id);

CREATE INDEX evaluation_responses_indicator_id_idx
  ON evaluation_responses (indicator_id);

-- ============================================================
-- DATOS DE CONFIGURACIÓN INICIAL
-- ============================================================

-- DIMENSIONES

INSERT INTO dimensions (
  id,
  name,
  description
)
VALUES
  (
    'administrative',
    'Administrativa',
    'Dimensión vinculada a la gestión administrativa y organizacional de la institución.'
  ),
  (
    'infrastructure',
    'Infraestructura',
    'Dimensión vinculada a las condiciones edilicias, servicios y recursos tecnológicos.'
  ),
  (
    'wellbeing',
    'Bienestar',
    'Dimensión vinculada a la convivencia, las redes comunitarias y el bienestar institucional.'
  ),
  (
    'pedagogy',
    'Pedagógica',
    'Dimensión vinculada a las prácticas pedagógicas, la innovación y la articulación educativa.'
  );

-- INDICADORES

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
    'staffing',
    'administrative',
    'Relación Matrícula vs. POF/PON',
    '¿Hay cargos docentes o preceptores faltantes o excedentes?',
    TRUE,
    FALSE
  ),
  (
    'novelties',
    'administrative',
    'Gestión de Novedades (MABs/CiDi)',
    '¿Existen cuellos de botella o demoras críticas en la carga?',
    TRUE,
    FALSE
  ),
  (
    'contingency',
    'administrative',
    'Asistencia Requerida',
    '¿Requieren apoyo prioritario de la Célula de Contingencia administrativa?',
    TRUE,
    FALSE
  ),
  (
    'building',
    'infrastructure',
    'Condiciones Edilicias Críticas',
    'Filtraciones, baños, electricidad, gas.',
    TRUE,
    FALSE
  ),
  (
    'cleaning',
    'infrastructure',
    'Servicio de Limpieza',
    'Evaluación del estado general y cumplimiento de la empresa contratada.',
    TRUE,
    FALSE
  ),
  (
    'connectivity',
    'infrastructure',
    'Conectividad y Parque Tecnológico',
    'Estado del piso tecnológico y disponibilidad real de equipos.',
    TRUE,
    FALSE
  ),
  (
    'aec',
    'wellbeing',
    'Acuerdos de Convivencia (AEC)',
    '¿Están actualizados y apropiados por la comunidad?',
    TRUE,
    FALSE
  ),
  (
    'conflict',
    'wellbeing',
    'Conflictividad Latente',
    'Tensiones recientes entre docentes, con familias o entre estudiantes que requieran mediación.',
    TRUE,
    FALSE
  ),
  (
    'community',
    'wellbeing',
    'Redes Comunitarias (CLE)',
    'Articulación actual con centros de salud, municipios o seguridad barrial.',
    TRUE,
    FALSE
  ),
  (
    'innovation',
    'pedagogy',
    'Proyectos de Innovación (PIE)',
    'Iniciativas propias vigentes y su impacto en la retención escolar.',
    FALSE,
    TRUE
  ),
  (
    'technology',
    'pedagogy',
    'Integración de Tecnologías Digitales',
    '¿Cómo se están utilizando pedagógicamente en el aula?',
    FALSE,
    TRUE
  ),
  (
    'articulation',
    'pedagogy',
    'Articulación Inter-niveles',
    'Si aplica: transición académica de los estudiantes dentro del mismo polo o edificio.',
    FALSE,
    TRUE
  );

-- CAMPOS DE INDICADORES

INSERT INTO indicator_fields (
  id,
  indicator_id,
  label,
  type,
  options
)
VALUES
  (
    'enrollment',
    'staffing',
    'Matrícula',
    'number',
    NULL
  ),
  (
    'pofPon',
    'staffing',
    'Cantidad de POF/PON',
    'number',
    NULL
  ),
  (
    'areas',
    'building',
    'Áreas comprometidas',
    'multiSelect',
    '["Filtraciones", "Baños", "Electricidad", "Gas"]'::jsonb
  ),
  (
    'company',
    'cleaning',
    'Empresa de limpieza',
    'text',
    NULL
  ),
  (
    'approvalDate',
    'aec',
    'Mes y año de aprobación',
    'month',
    NULL
  );

-- ROLES

INSERT INTO roles (
  id,
  name
)
VALUES
  (
    'responsable_territorial',
    'Responsable Territorial'
  ),
  (
    'responsable_institucional',
    'Responsable Institucional'
  ),
  (
    'admin',
    'Administrador'
  );

-- PERMISOS

INSERT INTO permissions (
  id,
  name
)
VALUES
  (
    'view_evaluations',
    'Consultar relevamientos'
  ),
  (
    'create_evaluations',
    'Crear relevamientos'
  ),
  (
    'edit_evaluations',
    'Editar relevamientos'
  ),
  (
    'close_evaluations',
    'Cerrar relevamientos'
  ),
  (
    'manage_users',
    'Administrar usuarios'
  ),
  (
    'manage_configuration',
    'Administrar configuración'
  );

-- MATRIZ DE PERMISOS

INSERT INTO role_permissions (
  role_id,
  permission_id
)
VALUES
  (
    'responsable_territorial',
    'view_evaluations'
  ),
  (
    'responsable_territorial',
    'create_evaluations'
  ),
  (
    'responsable_territorial',
    'edit_evaluations'
  ),
  (
    'responsable_territorial',
    'close_evaluations'
  ),
  (
    'responsable_institucional',
    'view_evaluations'
  ),
  (
    'admin',
    'view_evaluations'
  ),
  (
    'admin',
    'create_evaluations'
  ),
  (
    'admin',
    'edit_evaluations'
  ),
  (
    'admin',
    'close_evaluations'
  ),
  (
    'admin',
    'manage_users'
  ),
  (
    'admin',
    'manage_configuration'
  );

-- ============================================================
-- INSTITUCIONES
-- ============================================================

INSERT INTO institutions (
  id,
  cue,
  name,
  address,
  sector
)
VALUES
  ('inst-001', '140564803', 'C.E.N.M.A. BATERIA LIBERTAD ANEXO SEDE AGENCIA CORDOBA DEPORTE', 'AV. COLON 778', 'Estatal'),
  ('inst-002', '140236405', 'C.E.N.M.A. N° 135 - ANEXO SEDE ALECYT', '9 DE JULIO 975', 'Estatal'),
  ('inst-003', '140236400', 'C.E.N.M.A. Nº 135', 'SANTA ROSA 1299', 'Estatal'),
  ('inst-004', '140194208', 'C.E.N.M.A. Nº 232', 'LA RIOJA 1450', 'Estatal'),
  ('inst-005', '140061800', 'C.E.N.M.A. Nº 70 COMPAÑERO HUGO ESTANISLAO OCHOA', 'SANTA ROSA 650', 'Estatal'),
  ('inst-006', '140397200', 'COLEGIO AMPARO DE MARIA', 'CASEROS 730', 'Privado'),
  ('inst-007', NULL, 'COLEGIO DE SAN JOSE (H.H.DOMINICAS)', 'MARIANO MORENO 108', 'Privado'),
  ('inst-008', '140278400', 'COLEGIO EVANGELICO WILLIAM C. MORRIS', 'SAN JOSE DE CALASANZ 144', 'Privado'),
  ('inst-009', '140283700', 'COLEGIO LA PRIMERA ENSEÑANZA', 'LA RIOJA 1276', 'Privado'),
  ('inst-010', '140427000', 'COLEGIO MUSICAL COLLEGIUM', 'CASEROS 963', 'Privado'),
  ('inst-011', '140058100', 'COLEGIO PIO X', '9 DE JULIO 1050', 'Privado'),
  ('inst-012', '140397300', 'COLEGIO SANTO TOMAS', 'CASEROS 745', 'Privado'),
  ('inst-013', '140095501', 'DOCTOR EMILIO BAQUERO LAZCANO ANEXO EN ESCUELA SUPERIOR DE COMERCIO MANUEL BELGRANO', 'LA RIOJA 1450', 'Estatal'),
  ('inst-014', '140333800', 'ESC. NORMAL SUPERIOR ALEJANDRO CARBO', 'AV COLON 951', 'Estatal'),
  ('inst-015', NULL, 'ESCUELA MARIANO MORENO', 'SANTA ROSA 1299', 'Estatal'),
  ('inst-016', '140280600', 'I.P.E.M. Nº 115 DOMINGO FAUSTINO SARMIENTO', 'AV. COLON 1329', 'Estatal'),
  ('inst-017', '140396900', 'I.P.E.M. Nº 138 JERONIMO LUIS DE CABRERA', 'SANTA ROSA 650', 'Estatal'),
  ('inst-018', '140333700', 'I.P.E.M. Nº 270 GRAL. MANUEL BELGRANO', 'DEAN FUNES 850', 'Estatal'),
  ('inst-019', '140280300', 'I.P.E.T. Nº 247 ING. CARLOS CASSAFFOUSTH', 'DEAN FUNES 1511', 'Estatal'),
  ('inst-020', '140280500', 'INST. P/ADULTOS WILLIAM C.MORRIS', 'SAN JOSE DE CALAZANZ 144', 'Privado'),
  ('inst-021', '140397000', 'INST. SUP. COLLEGIUM - CENTRO DE EDUC.E INVEST.MUSICALES', 'CASEROS 963', 'Privado'),
  ('inst-022', '140270700', 'INST. SUP. MARIANO MORENO', 'LA RIOJA 1019', 'Privado'),
  ('inst-023', '140280400', 'INST.SECUNDARIO EVANGELICO WILLIAM C. MORRIS', 'SAN JOSE DE CALASANZ 144', 'Privado'),
  ('inst-024', '140443500', 'INSTITUCION CERVANTES', 'SANTA ROSA 1793', 'Privado'),
  ('inst-025', NULL, 'INSTITUTO DE SAN JOSE (H.H.DOMINICAS)', 'MARIANO MORENO 108', 'Privado'),
  ('inst-026', '140270500', 'INSTITUTO INTEGRAL MODELO', 'RODRIGUEZ PEÑA 227', 'Privado'),
  ('inst-027', '140467900', 'INSTITUTO LA PRIMERA ENSEÑANZA', 'LA RIOJA 1276', 'Privado'),
  ('inst-028', '140473300', 'INSTITUTO MUSICAL COLLEGIUM', 'CASEROS 963', 'Privado'),
  ('inst-029', '140061700', 'INSTITUTO PIO X', '9 DE JULIO 1050', 'Privado'),
  ('inst-030', '140342100', 'INSTITUTO SALESIANO PIO X-NIVEL SUPERIOR-', 'AV COLON 1051', 'Privado'),
  ('inst-031', '140395200', 'INSTITUTO SANTO TOMAS', 'CASEROS 745', 'Privado'),
  ('inst-032', '140422900', 'J.DE INF. AMPARO DE MARIA', 'CASEROS 730', 'Privado'),
  ('inst-033', '140477100', 'J.DE INF. COLLEGIUM', 'CASEROS 963', 'Privado'),
  ('inst-034', '140565400', 'J.DE INF. LA PRIMERA ENSEÑANZA', 'LA RIOJA 1276', 'Privado'),
  ('inst-035', NULL, 'J.DE INF. MARIANO MORENO', 'AV. SANTA FE 270', 'Estatal'),
  ('inst-036', '140575400', 'J.DE INF. PIO X', '9 DE JULIO 1050', 'Privado'),
  ('inst-037', '140571500', 'JARDIN MUNICIPAL DEODORO', 'ARTIGAS 150', 'Estatal'),
  ('inst-038', NULL, 'ESCUELA SUP. DE COMERCIO MANUEL BELGRANO', 'LA RIOJA 1450', 'Estatal'),
  ('inst-039', '1405441XX', 'INSTITUTO TECNICO SUPERIOR CORDOBA', 'RIO NEGRO 77', 'Estatal'),
  ('inst-040', '140330900', 'J.DE INF. WILLIAN C. MORRIS', 'SAN JOSE DE CALASANZ 142', 'Privado'),
  ('inst-041', '140542701', 'C.E.N.M.A. B º S.M.A.T.A. ANEXO SEDE SMATA', '27 DE ABRIL 633', 'Estatal'),
  ('inst-042', '140511205', 'C.E.N.M.A. DEAN FUNES ANEXO SEDE CONCEJO DELIBERANTE', 'PASAJE DE COMERCIO 447', 'Estatal'),
  ('inst-043', '140293802', 'ESCUELA NOCTURNA MERCEDITAS DE SAN MARTIN EXT AULICA CONCEJO DELIBERANTE', 'PASAJE DE COMERCIO 447', 'Estatal'),
  ('inst-044', '140470400', 'INST. C.E.D.(CENTRO DE ESTUDIOS A DISTANCIA)', 'INDEPENDENCIA 233', 'Privado'),
  ('inst-045', '140489500', 'INST. SUP. BANCARIO', 'SAN JERONIMO 224', 'Privado'),
  ('inst-046', '140211700', 'INSTITUTO AMPARO DE MARIA', 'CASEROS 730', 'Privado'),
  ('inst-047', '140518500', 'INSTITUTO SECUNDARIO BANCARIO', 'SAN JERONIMO 224', 'Privado'),
  ('inst-048', '140558000', 'INSTITUTO SUPERIOR DE FORMACION DOCENTE CALASANZ', 'CASEROS 745', 'Privado'),
  ('inst-049', '140575200', 'INSTITUTO SUPERIOR POLITECNICO CORDOBA', 'AV. HUMBERTO PRIMO 680', 'Estatal');

-- NIVELES INSTITUCIONALES

INSERT INTO institution_levels (
  id,
  institution_id,
  level,
  empresa
)
VALUES
  ('inst-001-level-001', 'inst-001', 'Secundario', 'EE0117213'),
  ('inst-002-level-001', 'inst-002', 'Secundario', 'EE0117152'),
  ('inst-003-level-001', 'inst-003', 'Secundario', 'EE0110093'),
  ('inst-004-level-001', 'inst-004', 'Secundario', 'EE0117273'),
  ('inst-005-level-001', 'inst-005', 'Secundario', 'EE0110088'),
  ('inst-006-level-001', 'inst-006', 'Primario', 'EE1110025'),
  ('inst-007-level-001', 'inst-007', 'Inicial', NULL),
  ('inst-007-level-002', 'inst-007', 'Primario', NULL),
  ('inst-008-level-001', 'inst-008', 'Primario', 'EE1110024'),
  ('inst-009-level-001', 'inst-009', 'Primario', 'EE1111008'),
  ('inst-010-level-001', 'inst-010', 'Primario', 'EE1110093'),
  ('inst-011-level-001', 'inst-011', 'Primario', 'EE1110035'),
  ('inst-012-level-001', 'inst-012', 'Primario', 'EE1110041'),
  ('inst-012-level-002', 'inst-012', 'Inicial', 'EE1510041'),
  ('inst-013-level-001', 'inst-013', 'Primario', 'EE3400008'),
  ('inst-014-level-001', 'inst-014', 'Inicial', 'EE0330329'),
  ('inst-014-level-002', 'inst-014', 'Primario', 'EE0330330'),
  ('inst-014-level-003', 'inst-014', 'Secundario', 'EE0330331'),
  ('inst-014-level-004', 'inst-014', 'Superior', 'EE0330332'),
  ('inst-015-level-001', 'inst-015', 'Primario', NULL),
  ('inst-016-level-001', 'inst-016', 'Secundario', 'EE0310540'),
  ('inst-017-level-001', 'inst-017', 'Secundario', 'EE0310601'),
  ('inst-018-level-001', 'inst-018', 'Secundario', 'EE0320007'),
  ('inst-019-level-001', 'inst-019', 'Secundario', 'EE0320014'),
  ('inst-020-level-001', 'inst-020', 'Secundario', 'EE1210949'),
  ('inst-021-level-001', 'inst-021', 'Superior', NULL),
  ('inst-021-level-002', 'inst-021', 'Artística', NULL),
  ('inst-022-level-001', 'inst-022', 'Superior', 'EE1311024'),
  ('inst-023-level-001', 'inst-023', 'Secundario', 'EE1210905'),
  ('inst-024-level-001', 'inst-024', 'Superior', 'EE1311022'),
  ('inst-025-level-001', 'inst-025', 'Secundario', NULL),
  ('inst-026-level-001', 'inst-026', 'Secundario', 'EE1230061'),
  ('inst-027-level-001', 'inst-027', 'Secundario', 'EE1211008'),
  ('inst-028-level-001', 'inst-028', 'Secundario', 'EE1210972'),
  ('inst-029-level-001', 'inst-029', 'Secundario', 'EE1230058'),
  ('inst-030-level-001', 'inst-030', 'Superior', 'EE1350017'),
  ('inst-031-level-001', 'inst-031', 'Secundario', 'EE1230054'),
  ('inst-032-level-001', 'inst-032', 'Inicial', 'EE1510025'),
  ('inst-033-level-001', 'inst-033', 'Inicial', 'EE1510093'),
  ('inst-034-level-001', 'inst-034', 'Inicial', 'EE1511008'),
  ('inst-035-level-001', 'inst-035', 'Inicial', NULL),
  ('inst-036-level-001', 'inst-036', 'Inicial', 'EE1510035'),
  ('inst-037-level-001', 'inst-037', 'Inicial', 'EE3500075'),
  ('inst-038-level-001', 'inst-038', 'Primario', NULL),
  ('inst-038-level-002', 'inst-038', 'Secundario', NULL),
  ('inst-038-level-003', 'inst-038', 'Superior', NULL),
  ('inst-039-level-001', 'inst-039', 'Superior', 'EE0310957'),
  ('inst-040-level-001', 'inst-040', 'Inicial', 'EE1510024'),
  ('inst-041-level-001', 'inst-041', 'Secundario', 'EE0117015'),
  ('inst-042-level-001', 'inst-042', 'Secundario', 'EE0117228'),
  ('inst-043-level-001', 'inst-043', 'Primario', 'EE0111752'),
  ('inst-044-level-001', 'inst-044', 'Secundario', 'EE1211005'),
  ('inst-045-level-001', 'inst-045', 'Superior', 'EE1310963'),
  ('inst-046-level-001', 'inst-046', 'Secundario', 'EE1230017'),
  ('inst-047-level-001', 'inst-047', 'Secundario', 'EE1210978'),
  ('inst-048-level-001', 'inst-048', 'Superior', 'EE1311016'),
  ('inst-049-level-001', 'inst-049', 'Superior', NULL),
  ('inst-049-level-002', 'inst-049', 'Formación Profesional', NULL);

COMMIT;
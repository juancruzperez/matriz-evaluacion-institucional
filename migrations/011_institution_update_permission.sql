BEGIN;

INSERT INTO permissions (
    id,
    name
)
VALUES (
    'institution_update',
    'Editar datos institucionales'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (
    role_id,
    permission_id
)
VALUES
    (
        'responsable_territorial',
        'institution_update'
    ),
    (
        'admin',
        'institution_update'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
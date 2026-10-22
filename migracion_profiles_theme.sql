-- onti-notes-app | Preferencia visual para public.profiles existente.
-- Revisar y ejecutar en SQL Editor con un rol administrador.
-- Idempotente: no crea perfiles ni modifica RLS, permisos o Storage.
-- Ejecutar primero migracion_profiles_created_at.sql si faltan las fechas.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Falta public.profiles: revisar squema.sql antes de migrar.';
    END IF;
END;
$$;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS theme_preference TEXT;

-- No convertir silenciosamente tipos ajenos a una preferencia de texto.
DO $$
DECLARE
    preference_type REGTYPE;
BEGIN
    SELECT atttypid::regtype INTO preference_type
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass
      AND attname = 'theme_preference'
      AND attnum > 0 AND NOT attisdropped;

    IF preference_type NOT IN (
        'text'::regtype, 'character varying'::regtype, 'character'::regtype
    ) THEN
        RAISE EXCEPTION 'Tipo incompatible de theme_preference: %.', preference_type;
    END IF;

    IF preference_type <> 'text'::regtype THEN
        ALTER TABLE public.profiles
            ALTER COLUMN theme_preference TYPE TEXT
            USING theme_preference::text;
    END IF;
END;
$$;

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;

UPDATE public.profiles
SET theme_preference = 'system'
WHERE theme_preference IS NULL
   OR theme_preference NOT IN ('system', 'light', 'dark');

ALTER TABLE public.profiles
    ALTER COLUMN theme_preference SET DEFAULT 'system',
    ALTER COLUMN theme_preference SET NOT NULL,
    ADD CONSTRAINT profiles_theme_preference_check
        CHECK (theme_preference IN ('system', 'light', 'dark'));

COMMENT ON COLUMN public.profiles.theme_preference IS
    'Tema de la interfaz: system (predeterminado), light o dark.';

NOTIFY pgrst, 'reload schema';

COMMIT;

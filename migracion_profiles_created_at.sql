-- onti-notes-app | Fechas de public.profiles existente.
-- Revisar y ejecutar en SQL Editor con un rol administrador.
-- Idempotente: no crea perfiles ni cambia RLS, permisos o Storage.
-- Conserva fechas existentes. Si dated_at y created_at coexisten,
-- dated_at se conserva y solo rellena created_at cuando está vacío.
-- IMPORTANTE: fechas sin zona (timestamp/date) se interpretan como UTC.
-- Confirmar esa convención para los datos heredados antes de ejecutar.
-- Los tipos de fechas incompatibles abortan toda la transacción.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Falta public.profiles: revisar squema.sql antes de migrar.';
    END IF;
END;
$$;

-- Evitar que el trigger de fechas restaure un created_at nulo durante
-- el relleno. Se reinstala al final dentro de la misma transacción.
DROP TRIGGER IF EXISTS trg_profiles_before_write ON public.profiles;
-- Nombre usado por la primera versión del esquema de la aplicación.
DROP TRIGGER IF EXISTS trg_profiles_before_update ON public.profiles;

DO $$
DECLARE
    legacy_type REGTYPE;
    creation_type REGTYPE;
    modification_type REGTYPE;
BEGIN
    SELECT atttypid::regtype INTO legacy_type
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attname = 'dated_at'
      AND attnum > 0 AND NOT attisdropped;

    SELECT atttypid::regtype INTO creation_type
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attname = 'created_at'
      AND attnum > 0 AND NOT attisdropped;

    SELECT atttypid::regtype INTO modification_type
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attname = 'updated_at'
      AND attnum > 0 AND NOT attisdropped;

    IF legacy_type IS NOT NULL AND legacy_type NOT IN (
        'timestamp with time zone'::regtype,
        'timestamp without time zone'::regtype, 'date'::regtype
    ) THEN
        RAISE EXCEPTION 'Tipo incompatible de dated_at: %.', legacy_type;
    END IF;

    IF creation_type IS NOT NULL AND creation_type NOT IN (
        'timestamp with time zone'::regtype,
        'timestamp without time zone'::regtype, 'date'::regtype
    ) THEN
        RAISE EXCEPTION 'Tipo incompatible de created_at: %.', creation_type;
    END IF;

    IF modification_type IS NOT NULL AND modification_type NOT IN (
        'timestamp with time zone'::regtype,
        'timestamp without time zone'::regtype, 'date'::regtype
    ) THEN
        RAISE EXCEPTION 'Tipo incompatible de updated_at: %.', modification_type;
    END IF;

    IF creation_type IS NULL THEN
        IF legacy_type IS NOT NULL THEN
            ALTER TABLE public.profiles RENAME COLUMN dated_at TO created_at;
            creation_type := legacy_type;
            legacy_type := NULL;
        ELSE
            ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ;
            creation_type := 'timestamp with time zone'::regtype;
        END IF;
    END IF;

    IF creation_type <> 'timestamp with time zone'::regtype THEN
        ALTER TABLE public.profiles
            ALTER COLUMN created_at TYPE TIMESTAMPTZ
            USING created_at::timestamp AT TIME ZONE 'UTC';
    END IF;

    IF modification_type IS NULL THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ;
    ELSIF modification_type <> 'timestamp with time zone'::regtype THEN
        ALTER TABLE public.profiles
            ALTER COLUMN updated_at TYPE TIMESTAMPTZ
            USING updated_at::timestamp AT TIME ZONE 'UTC';
    END IF;

    IF legacy_type = 'timestamp with time zone'::regtype THEN
        EXECUTE 'UPDATE public.profiles SET created_at = dated_at WHERE created_at IS NULL AND dated_at IS NOT NULL';
    ELSIF legacy_type IS NOT NULL THEN
        EXECUTE 'UPDATE public.profiles SET created_at = dated_at::timestamp AT TIME ZONE ''UTC'' WHERE created_at IS NULL AND dated_at IS NOT NULL';
    END IF;
END;
$$;

-- Completar únicamente huecos; nunca reemplazar fechas ya registradas.
-- Las fechas de Auth son la segunda fuente después del legado del perfil.
WITH missing_dates AS (
    SELECT
        profile.id,
        COALESCE(profile.created_at, auth_user.created_at, NOW()) AS created_at,
        COALESCE(
            profile.updated_at, profile.created_at, auth_user.created_at, NOW()
        ) AS updated_at
    FROM public.profiles AS profile
    LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE profile.created_at IS NULL OR profile.updated_at IS NULL
)
UPDATE public.profiles AS profile
SET created_at = missing_dates.created_at,
    updated_at = missing_dates.updated_at
FROM missing_dates
WHERE profile.id = missing_dates.id;

ALTER TABLE public.profiles
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET NOT NULL;

COMMENT ON COLUMN public.profiles.created_at IS
    'Fecha de creación del perfil, definida automáticamente y no editable.';
COMMENT ON COLUMN public.profiles.updated_at IS
    'Fecha de última modificación del perfil, actualizada automáticamente.';

CREATE OR REPLACE FUNCTION public.profiles_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := NOW();
        NEW.updated_at := NOW();
    ELSE
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'No se permite cambiar el ID del perfil.'
                USING ERRCODE = '23514';
        END IF;
        NEW.created_at := OLD.created_at;
        NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_before_write
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_before_write();

NOTIFY pgrst, 'reload schema';

COMMIT;

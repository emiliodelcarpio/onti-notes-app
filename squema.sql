-- ============================================================================
-- onti-notes-app | squema.sql
-- Esquema de referencia para Supabase PostgreSQL (MVP de pruebas)
--
-- Refleja el SQL REAL utilizado para public.profiles y el bucket avatars,
-- más la columna theme_preference solicitada y el esquema actual de notes.
--
-- IMPORTANTE:
-- * Para profiles YA CREADA, usar las migraciones correspondientes:
--   migracion_profiles_theme.sql (tema, si falta) y
--   migracion_profiles_created_at.sql (corrige dated_at -> created_at).
--   CREATE TABLE IF NOT EXISTS NO altera columnas existentes.
-- * Se conservan username, full_name, email y avatar_url.
-- * created_at y updated_at son gestionados automáticamente en la DB.
-- * El email de autenticación sigue administrándose en Supabase Auth;
--   profiles.email, si se usa, es una copia que puede desactualizarse.
-- * Los permisos de profiles y avatars se reproducen TAL CUAL se compartieron
--   para documentar el estado actual. Requieren una revisión de privacidad:
--   SELECT público en profiles expone también email, y cualquier persona puede
--   insertar objetos en avatars. No asumir que estos permisos son seguros.
-- * No se programan ni envían correos desde este esquema.
-- ============================================================================

BEGIN;

-- 1. Perfiles: columnas exactas de la implementación existente + tema.
-- Sin ON DELETE CASCADE porque la FK utilizada originalmente no lo incluye.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    theme_preference TEXT NOT NULL DEFAULT 'system',
    CONSTRAINT profiles_theme_preference_check
        CHECK (theme_preference IN ('system', 'light', 'dark'))
);

COMMENT ON TABLE public.profiles IS
    'Perfil vinculado a auth.users; contiene preferencias de apariencia.';
COMMENT ON COLUMN public.profiles.theme_preference IS
    'Tema de la interfaz: system (predeterminado), light o dark.';
COMMENT ON COLUMN public.profiles.created_at IS
    'Fecha de creación del perfil, definida automáticamente y no editable.';
COMMENT ON COLUMN public.profiles.updated_at IS
    'Fecha de última modificación del perfil, actualizada automáticamente.';
COMMENT ON COLUMN public.profiles.email IS
    'Campo heredado; la identidad y el email autenticado se administran en auth.users.';
COMMENT ON COLUMN public.profiles.username IS
    'Campo heredado; NO se utiliza para iniciar sesión (solo correo y contraseña).';

-- 2. Permisos de profiles: reflejan la instalación proporcionada.
-- ATENCIÓN: anon con SELECT y la política pública exponen todas las columnas.
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone."
    ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile."
    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile."
    ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone."
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile."
    ON public.profiles FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile."
    ON public.profiles FOR UPDATE
    USING ((SELECT auth.uid()) = id);

-- 3. Timestamps de perfiles: se asignan en la DB y se protegen
--    frente a modificaciones manuales. No se permite cambiar el ID.
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

DROP TRIGGER IF EXISTS trg_profiles_before_write ON public.profiles;
CREATE TRIGGER trg_profiles_before_write
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_before_write();

-- 4. Trigger de alta de usuarios en auth.users.
-- Copia full_name y avatar_url desde los metadatos de registro;
-- created_at / updated_at se generan automáticamente al insertar.
-- SECURITY DEFINER con search_path vacío; referencias cualificadas.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Storage para avatares (según implementación existente).
-- No cambiamos el indicador 'public' del bucket; la política SELECT
-- original habilita únicamente las operaciones que especifica.
INSERT INTO storage.buckets (id, name)
VALUES ('avatars', 'avatars')
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas originales de Storage.
-- ATENCIÓN: la inserción sin comprobación de identidad no es adecuada
-- para una app abierta al público. Este bloque documenta el estado actual;
-- conviene endurecerlo en una migración separada antes de producción.
DROP POLICY IF EXISTS "Avatar images are publicly accessible."
    ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar."
    ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their own avatar."
    ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible."
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'avatars'
        AND storage.allow_any_operation(
            ARRAY['object.get_authenticated_info', 'object.get_authenticated']
        )
    );

CREATE POLICY "Anyone can upload an avatar."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar."
    ON storage.objects FOR UPDATE
    USING ((SELECT auth.uid()) = owner)
    WITH CHECK (bucket_id = 'avatars');

-- 7. Consistencia con la UI:
-- full_name es el nombre visible, avatar_url es opcional y
-- theme_preference es system | light | dark. No existe timezone ni
-- display_name; created_at y updated_at sí existen en profiles.

-- 8. Notas y recordatorios en una misma tabla.
-- user_id continúa referenciando auth.users.id para respetar
-- el esquema anterior; coincide con public.profiles.id.
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid()
        REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL DEFAULT 'note',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'backlog',
    color TEXT NOT NULL DEFAULT 'indigo',
    remind_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notes_title_not_empty
        CHECK (CHAR_LENGTH(BTRIM(title)) > 0),
    CONSTRAINT notes_type_check
        CHECK (type IN ('note', 'reminder')),
    CONSTRAINT notes_priority_check
        CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT notes_status_check
        CHECK (status IN (
            'backlog', 'pending', 'in_progress', 'in_review',
            'on_hold', 'completed', 'archived'
        )),
    CONSTRAINT notes_color_check
        CHECK (color IN ('indigo', 'teal', 'amber', 'rose', 'violet')),
    CONSTRAINT notes_reminder_date_check
        CHECK (
            (type = 'note' AND remind_at IS NULL)
            OR
            (type = 'reminder' AND remind_at IS NOT NULL)
        )
);

COMMENT ON TABLE public.notes IS
    'Notas y recordatorios privados por usuario.';
COMMENT ON COLUMN public.notes.remind_at IS
    'Instante programado de un recordatorio, sin envío automático de correo.';

-- 9. Validaciones de cambios y timestamps de notas.
-- Una fecha futura se exige al programar o reprogramar;
-- no se rechaza la edición de un recordatorio ya vencido.
CREATE OR REPLACE FUNCTION public.notes_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := NOW();
        NEW.updated_at := NOW();

        IF NEW.type = 'reminder' AND
           (NEW.remind_at IS NULL OR NEW.remind_at <= NOW()) THEN
            RAISE EXCEPTION 'La fecha del recordatorio debe ser futura.'
                USING ERRCODE = '23514';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'No se puede cambiar el propietario de una nota.'
                USING ERRCODE = '23514';
        END IF;

        NEW.created_at := OLD.created_at;
        NEW.updated_at := NOW();

        IF (NEW.type IS DISTINCT FROM OLD.type
            OR NEW.remind_at IS DISTINCT FROM OLD.remind_at)
           AND NEW.type = 'reminder'
           AND (NEW.remind_at IS NULL OR NEW.remind_at <= NOW()) THEN
            RAISE EXCEPTION 'La fecha del recordatorio debe ser futura.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notes_before_write ON public.notes;
CREATE TRIGGER trg_notes_before_write
    BEFORE INSERT OR UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.notes_before_write();

-- 10. Índices para listados, Kanban y futuros recordatorios.
CREATE INDEX IF NOT EXISTS idx_notes_user_created_at
    ON public.notes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_status
    ON public.notes (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pending_reminders
    ON public.notes (remind_at)
    WHERE type = 'reminder'
      AND status NOT IN ('completed', 'archived');

-- 11. Permisos y RLS para notas.
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.notes TO authenticated;
GRANT INSERT (title, content, type, priority, status, color, remind_at)
    ON TABLE public.notes TO authenticated;
GRANT UPDATE (title, content, type, priority, status, color, remind_at)
    ON TABLE public.notes TO authenticated;

DROP POLICY IF EXISTS notes_select_own ON public.notes;
DROP POLICY IF EXISTS notes_insert_own ON public.notes;
DROP POLICY IF EXISTS notes_update_own ON public.notes;
DROP POLICY IF EXISTS notes_delete_own ON public.notes;

CREATE POLICY notes_select_own
    ON public.notes FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY notes_insert_own
    ON public.notes FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notes_update_own
    ON public.notes FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notes_delete_own
    ON public.notes FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

COMMIT;

-- ============================================================================
-- NOTAS DE INTEGRACIÓN
-- ============================================================================
-- 1. profiles.id corresponde a auth.users.id y notes.user_id.
-- 2. La autenticación es exclusivamente por email y contraseña.
-- 3. Tema visual: system | light | dark; default de DB: system.
-- 4. Los campos reales del perfil son full_name, avatar_url, email,
--    username, created_at y updated_at (además de id y theme_preference).
-- 5. El campo username, aunque existente, no habilita login por usuario.
-- 6. La política SELECT pública de profiles expone email: revisar antes de
--    cargar información sensible o habilitar acceso fuera de pruebas.
-- 7. La política INSERT de avatars permite subidas sin autenticación:
--    restringirla por usuario/carpeta antes de uso público.
-- 8. Este archivo representa un esquema para instalación NUEVA; para
--    modificar profiles existente ejecutar migracion_profiles_created_at.sql
--    y, si falta el tema, migracion_profiles_theme.sql.
-- 9. Notes sigue protegido por RLS por propietario; no se incluyen
--    funciones de correo, SMTP, Cron ni Edge Functions.
-- ============================================================================

-- ============================================================================
-- Avatares privados en Supabase Storage (instalación existente).
-- Revisar y ejecutar completo en SQL Editor con un rol administrador.
-- Idempotente: no elimina archivos, no mueve objetos y no cambia profiles/notes.
-- Los objetos heredados sin carpeta del usuario o sin owner_id requieren
-- volver a subir la imagen desde la aplicación para poder usarse como privados.
-- ============================================================================

BEGIN;

-- Supabase administra esta tabla y habilita RLS de forma predeterminada.
-- Si se deshabilitó manualmente, detenerse en lugar de instalar políticas inertes.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS table_info
        JOIN pg_catalog.pg_namespace AS schema_info
            ON schema_info.oid = table_info.relnamespace
        WHERE schema_info.nspname = 'storage'
          AND table_info.relname = 'objects'
          AND table_info.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'storage.objects debe existir y tener RLS habilitado. Revisar Storage antes de continuar.';
    END IF;
END;
$$;

INSERT INTO storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
    'avatars', 'avatars', false, 2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Sustituir únicamente los nombres heredados conocidos de avatars.
-- No borrar otras políticas de Storage ni modificar otros buckets.
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;

DROP POLICY IF EXISTS avatars_select_own ON storage.objects;
DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
DROP POLICY IF EXISTS avatars_select_guard ON storage.objects;
DROP POLICY IF EXISTS avatars_insert_guard ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_guard ON storage.objects;
DROP POLICY IF EXISTS avatars_update_guard ON storage.objects;

CREATE POLICY avatars_select_own
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        AND owner_id = (SELECT auth.uid()::text)
    );

CREATE POLICY avatars_insert_own
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        AND owner_id = (SELECT auth.uid()::text)
        AND name ~ (
            '^' || (SELECT auth.uid()::text)
            || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
        )
    );

CREATE POLICY avatars_delete_own
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        AND owner_id = (SELECT auth.uid()::text)
    );

-- Las políticas PERMISSIVE se combinan con OR. Estas restricciones impiden
-- que una política general heredada abra avatars accidentalmente. Para los
-- demás buckets devuelven true y no añaden ni retiran acceso por sí mismas.
CREATE POLICY avatars_select_guard
    ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC
    USING (
        bucket_id <> 'avatars' OR (
            (SELECT auth.uid()) IS NOT NULL
            AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
            AND owner_id = (SELECT auth.uid()::text)
        )
    );

CREATE POLICY avatars_insert_guard
    ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
    WITH CHECK (
        bucket_id <> 'avatars' OR (
            (SELECT auth.uid()) IS NOT NULL
            AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
            AND owner_id = (SELECT auth.uid()::text)
            AND name ~ (
                '^' || (SELECT auth.uid()::text)
                || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
            )
        )
    );

CREATE POLICY avatars_delete_guard
    ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
    USING (
        bucket_id <> 'avatars' OR (
            (SELECT auth.uid()) IS NOT NULL
            AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
            AND owner_id = (SELECT auth.uid()::text)
        )
    );

-- La aplicación siempre genera una ruta nueva y sube con upsert: false.
-- Bloquear UPDATE también impide mover objetos de otro bucket a avatars.
CREATE POLICY avatars_update_guard
    ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
    USING (bucket_id <> 'avatars')
    WITH CHECK (bucket_id <> 'avatars');

COMMIT;

-- Comprobaciones de configuración: no muestran archivos ni datos de usuarios.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'avatars';

-- Revisar TODAS las políticas: las generales también pueden afectar avatars.
-- Deben aparecer las tres políticas propias y las cuatro restricciones.
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

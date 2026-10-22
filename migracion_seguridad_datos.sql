-- Seguridad de datos de la aplicación. Ejecutar completo en SQL Editor como administrador.
-- No borra datos ni cambia columnas. Requiere las columnas oficiales de schema.sql.
BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL (id, username, full_name, avatar_url, email, created_at, updated_at, theme_preference)
    ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, theme_preference, created_at, updated_at)
    ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, theme_preference)
    ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_owner_guard ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
-- Una política permisiva heredada no debe abrir las filas de otro usuario.
CREATE POLICY profiles_owner_guard ON public.profiles AS RESTRICTIVE FOR ALL TO PUBLIC
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notes FROM PUBLIC, anon, authenticated;
REVOKE ALL (id, user_id, title, content, type, priority, status, color, remind_at, created_at, updated_at)
    ON public.notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.notes TO authenticated;
GRANT INSERT (title, content, type, priority, status, color, remind_at)
    ON public.notes TO authenticated;
GRANT UPDATE (title, content, type, priority, status, color, remind_at)
    ON public.notes TO authenticated;
DROP POLICY IF EXISTS notes_select_own ON public.notes;
DROP POLICY IF EXISTS notes_insert_own ON public.notes;
DROP POLICY IF EXISTS notes_update_own ON public.notes;
DROP POLICY IF EXISTS notes_delete_own ON public.notes;
DROP POLICY IF EXISTS notes_owner_guard ON public.notes;
CREATE POLICY notes_select_own ON public.notes FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY notes_insert_own ON public.notes FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY notes_update_own ON public.notes FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY notes_delete_own ON public.notes FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY notes_owner_guard ON public.notes AS RESTRICTIVE FOR ALL TO PUBLIC
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Retirar la invocación directa desde la API. Los triggers ya instalados
-- mantienen su ejecución y el administrador conserva sus permisos.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notes_before_write() FROM PUBLIC, anon, authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';

-- Verificación sin datos personales. Estos cuatro valores deben ser false.
SELECT
    has_any_column_privilege('anon', 'public.profiles', 'SELECT') AS anon_can_read_profiles,
    has_any_column_privilege('anon', 'public.notes', 'SELECT') AS anon_can_read_notes,
    has_column_privilege('authenticated', 'public.profiles', 'email', 'SELECT') AS app_can_read_legacy_email,
    has_column_privilege('authenticated', 'public.notes', 'user_id', 'UPDATE') AS app_can_change_note_owner;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public' AND tablename IN ('profiles', 'notes')
ORDER BY tablename, policyname;

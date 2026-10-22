# CLAUDE.md — onti-notes-app

## Objetivo
Construir un MVP de notas y recordatorios personales con registro, inicio de sesión y datos privados por usuario. El proyecto está en **fase de desarrollo y pruebas**, sin uso en producción por ahora. Priorizar simplicidad, seguridad y código fácil de mantener.

## Roles complementarios
- Actuar con criterio de Arquitecto de Software Senior, Lead Full-Stack Engineer y Lead UX/UI Designer. Las perspectivas se complementan; priorizar decisiones simples, seguras y útiles para el MVP.

## Stack
- Next.js (App Router), React y TypeScript en modo estricto.
- Tailwind CSS para estilos; usar utilidades directamente y centralizar estilos globales en `app/globals.css`.
- Supabase: Auth, PostgreSQL y Row Level Security (RLS).
- `@supabase/supabase-js` y `@supabase/ssr` para los clientes de Supabase.
- npm y ESLint. Sin Vitest, Playwright ni frameworks de testing por ahora.
- No añadir dependencias ni capas arquitectónicas sin una necesidad concreta.

## Estructura oficial
```text
app/          # Rutas, layouts, páginas y estilos globales
  globals.css
  layout.tsx
  page.tsx
actions/      # Server Actions / controladores
components/   # Componentes reutilizables de UI
lib/          # Clientes Supabase para navegador y servidor
  supabase/
types/        # Tipos TypeScript de dominio y base de datos
```

- No usar `src/`, `features/`, `services/` ni `repositories/`.
- `app/`: rutas y composición de vistas; Server Components por defecto.
- `actions/`: operaciones del servidor, validación de entradas y control de acceso.
- `components/`: UI reutilizable; agregar `'use client'` solo cuando sea necesario.
- `lib/`: configuración de Supabase y utilidades mínimas, sin lógica de presentación.
- `types/`: tipos compartidos explícitos; evitar duplicar los tipos generados de la base de datos.
- Mantener el esquema SQL oficial en `squema.sql` en la raíz. No modificar tablas o RLS sin actualizar también ese archivo y los tipos correspondientes.
- Usar `app/api/` únicamente si hace falta exponer un endpoint HTTP.

## Server y Client Components
- Usar Server Components por defecto, también para vistas protegidas: consultar datos y validar la sesión en el servidor.
- Añadir `'use client'` solo donde se necesiten hooks de cliente (`useState`, `useEffect`, `useContext`, `useAuth`), eventos (`onClick`, `onChange`) o APIs del navegador (`window`, `localStorage`).
- Mantener páginas y layouts como Server Components siempre que sea posible; aislar la interactividad en `components/` y pasar props serializables.
- `'use client'` define una frontera: los módulos importados por ella forman parte del código cliente. No repetirla en todos los hijos ni importar utilidades exclusivas del servidor.
- Las Server Actions de `actions/` usan `'use server'`, no `'use client'`.
- `useAuth` no sustituye la autorización en el servidor ni sincroniza notas entre pestañas. Si se usa para estado de sesión en el navegador, escuchar `onAuthStateChange` y limpiar la suscripción; para cambios de notas, actualizar/revalidar datos explícitamente.

## Reglas de código
- No usar `any`, `as any`, `@ts-ignore`, casts inseguros ni `!` para ocultar valores nulos.
- Preferir tipos inferidos y simples; usar `unknown` y validar datos externos.
- Funciones pequeñas, nombres descriptivos en inglés y una responsabilidad por módulo.
- Evitar duplicación, abstracciones prematuras, código muerto y dependencias innecesarias.
- Usar `async/await` y manejar errores de forma explícita.
- Aplicar las reglas de UX/UI de este documento; evitar estilos inline y CSS personalizado cuando basten utilidades de Tailwind.
- Modificar solo lo necesario y respetar las convenciones existentes.

## Autenticación
- Registro e inicio de sesión **únicamente mediante correo electrónico y contraseña** con Supabase Auth. No implementar nombres de usuario ni inicio de sesión por username.
- Manejar registro, inicio y cierre de sesión, recuperación de contraseña y verificación de correo según la configuración de Supabase Auth. Mantener mensajes de error seguros y comprensibles; no revelar si una cuenta existe.
- No guardar contraseñas en tablas propias. `auth.users` es la fuente de identidad y correo autenticado. `public.profiles.email` existe en el esquema heredado, pero no debe tratarse como fuente de autenticación ni asumirse sincronizado automáticamente.
- Probar confirmación de registro y recuperación de contraseña solo con direcciones de correo autorizadas y la configuración de pruebas de Supabase Auth. No configurar un SMTP productivo por ahora; no asumir que el servicio predeterminado permite enviar a cualquier dirección.

## Modelo de perfiles (`public.profiles`)
- Relación **1:1** con `auth.users`: `profiles.id` es la misma UUID y referencia al usuario. La FK instalada **no tiene `ON DELETE CASCADE`**; no asumir borrado automático al eliminar una cuenta.
- Campos oficiales: `id`, `username` (único, no se usa para iniciar sesión), `full_name` (nombre visible), `avatar_url`, `email` (copia opcional, no fuente de identidad), `created_at` (fecha de creación), `updated_at` (última modificación) y `theme_preference` (`system` | `light` | `dark`, por defecto `system`). No usar `dated_at` ni suponer columnas `display_name` o `timezone`.
- `created_at` y `updated_at` son `TIMESTAMPTZ NOT NULL DEFAULT now()`; la base de datos los mantiene automáticamente: `created_at` no se modifica y `updated_at` cambia con las ediciones del perfil.
- El perfil se crea automáticamente mediante `public.handle_new_user()` al registrarse en `auth.users`, copiando `full_name` y `avatar_url` de metadatos si existen. La migración `migracion_profiles_created_at.sql` conserva fechas de `dated_at` y rellena fechas de creación vacías con `auth.users.created_at` cuando exista; no sincroniza `email` automáticamente.
- En el SQL actualmente aplicado, `profiles` tiene lectura pública (incluido `email`) y cada usuario puede insertar y actualizar su propio perfil. **No asumir privacidad del perfil**: revisar y endurecer las políticas con una migración explícita antes de publicar la aplicación.
- Validar `full_name`, avatar y `theme_preference` en el servidor; nunca utilizar `raw_user_meta_data` para autorización. No ofrecer edición de zona horaria mientras no exista la columna. Existe un bucket `avatars` con permisos heredados de lectura y subida amplios: restringirlos antes de uso público.

## Modelo funcional de notas y recordatorios
- Usar **una sola entidad `Note`** para notas normales y recordatorios, diferenciada por el campo `type`: `note` | `reminder`.
- Campos previstos de cada nota:
  - `id`: identificador único.
  - `user_id`: propietario; obtenido de la sesión del servidor.
  - `title`: título obligatorio; `content`: descripción o cuerpo opcional.
  - `type`: `note` | `reminder` (por defecto `note`).
  - `priority`: `low` | `medium` | `high` (Baja, Media, Alta; por defecto Media).
  - `status`: `backlog` | `pending` | `in_progress` | `in_review` | `on_hold` | `completed` | `archived` (mostrar Backlog, Pendiente, En Proceso, En Revisión, En Espera, Completado y Archivado; por defecto Backlog).
  - `color`: una de **cinco opciones**: `indigo` | `teal` | `amber` | `rose` | `violet` (por defecto `indigo`). Guardar la clave del color, no un valor hexadecimal libre; evitar blanco y negro puros y asegurar contraste legible en ambos temas.
  - `remind_at`: fecha y hora del envío de correo; **obligatoria y futura cuando `type` es `reminder`** y `null` para `note`.
  - `created_at`: fecha de creación, asignada por la base de datos en UTC; `updated_at`: fecha de última modificación.
- Los valores persistidos son estables y en inglés; las etiquetas visibles se muestran en español. Tipar las opciones como uniones literales o enums simples y validar los valores permitidos en el servidor.
- El formulario debe revelar fecha y hora solo para recordatorios; mostrar la fecha según la zona horaria del usuario, guardar instantes en UTC y permitir editar o cancelar un recordatorio.
- **Guardar `remind_at` no envía correos por sí solo.** Los correos de recordatorio se contemplan **solo para pruebas controladas**. Si se decide probar envíos automáticos, evaluar Supabase Cron + Edge Function + un proveedor/configuración de correo de prueba; el SMTP de Supabase Auth no debe asumirse como servicio para enviar recordatorios.
- Si se implementan envíos de prueba, enviarlos únicamente a cuentas autorizadas, evitar duplicados, respetar cambios y cancelaciones, proteger credenciales y registrar resultados y errores. Un Cron periódico no garantiza precisión al segundo; nunca indicar que se envió un correo sin verificar el resultado.
- No se requiere configuración productiva, dominio de envío, entregabilidad garantizada ni integración con Resend por ahora. Hasta implementar el envío de prueba, la interfaz no debe prometer notificaciones reales. No crear todavía Edge Functions ni integraciones de correo.
- Las notas pueden cambiar de prioridad, estatus y color, y verse por columnas Kanban según su estatus. Mantener el MVP simple: no agregar colaboración, recurrencias ni notificaciones en tiempo real sin nueva decisión.
- `created_at` **no aparece por arte de magia en una tabla nueva**: mantener la columna declarada explícitamente en `squema.sql` con valor predeterminado de base de datos (`now()`). Supabase Auth ya administra sus propios campos internos; este requisito aplica a nuestras tablas de aplicación.

## Diseño y experiencia de usuario (UX/UI)
- Estilo **minimalista premium**, cálido y funcional: la prioridad es crear, encontrar y gestionar notas y recordatorios sin distracciones. Evitar pantallas vacías, exceso de adornos y animaciones innecesarias.
- Usar Tailwind CSS con criterios consistentes: base neutra (blancos cálidos y grises tipo `stone`/`zinc`), texto de alto contraste y acento `indigo` reservado para acciones principales. Centralizar colores, radios y superficies mediante variables/tokens en `app/globals.css`; no improvisar estilos distintos en cada pantalla.
- Tipografía clara y cuidada: preferir **Geist** con `next/font`, jerarquía visible de títulos y textos, espaciado generoso pero eficiente, bordes sutiles y sombras discretas. Diseñar *mobile-first* con buena legibilidad y áreas táctiles cómodas.
- Ofrecer **claro, oscuro y automático (sistema)**. Automático es el valor inicial; permitir cambio manual y recordar la elección en `profiles.theme_preference` para usuarios autenticados. Mantener tokens equivalentes, contraste adecuado y evitar destellos de tema incorrecto al cargar.
- Todo botón que inicia una operación asíncrona debe indicar estado pendiente (texto y/o indicador visual) y deshabilitarse mientras se procesa para prevenir envíos duplicados. Conservar feedback de éxito y error accesible, no depender solo del color.
- Mostrar estados de **carga, error y vacío**. Si no hay notas, presentar mensaje amistoso y una acción clara para crear la primera; nunca dejar un área de contenido en blanco sin explicación.
- Antes de eliminar una nota, abrir un **modal de confirmación** accesible, con acciones explícitas «Cancelar» y «Eliminar», foco controlado y posibilidad de cerrar sin borrar. No usar `alert()`, `confirm()` ni `prompt()` del navegador.
- Formularios simples y estilizados: etiquetas visibles, campos con espaciado uniforme, ayuda cuando aporte valor, validación clara junto al campo, estados de foco y deshabilitado, navegación por teclado y mensajes comprensibles.
- Mantener consistencia en botones, tarjetas, modales y campos reutilizables en `components/`. Priorizar accesibilidad (contraste, foco visible, semántica y responsive) sobre efectos decorativos; no añadir bibliotecas UI sin justificación.

## Datos y seguridad
- Cada usuario solo puede acceder a sus propias notas y recordatorios; verificar también la propiedad al editar, cambiar estatus o eliminar. **La lectura de perfiles actualmente es pública**, a diferencia del objetivo de privacidad; debe corregirse antes de abrir el acceso a terceros.
- Mantener RLS en `profiles` y `notes`; `notes` permite operaciones solo sobre datos propios. En el esquema heredado, `profiles` permite SELECT público y INSERT/UPDATE de perfil propio; documentar cualquier endurecimiento antes de cambiarlo. El trigger de Auth crea el perfil en el registro.
- Verificar la sesión en el servidor con Supabase Auth; no confiar en el `user_id` enviado por el cliente.
- Nunca exponer claves secretas, tokens ni la clave `service_role` en el navegador o el repositorio.
- Usar `.env.local` para secretos locales y `.env.example` solo para nombres de variables.
- No asumir campos o funcionalidades adicionales antes de definirlos.

## Comandos
```bash
npm ci                 # Instalar dependencias según package-lock.json
npm run dev            # Servidor de desarrollo
npm run lint           # ESLint
npm run typecheck      # TypeScript sin emitir archivos
npm run build          # Compilación de producción
npm run start          # Ejecutar la compilación
```

Scripts esperados en `package.json`: `dev: next dev`, `lint: eslint .`, `typecheck: tsc --noEmit`, `build: next build` y `start: next start`. Si falta alguno, configurarlo antes de ejecutarlo. Por ahora, validar manualmente autenticación, creación automática y edición de perfiles, CRUD de notas, RLS y aislamiento entre cuentas; revisar exposición de email público y permisos de avatars antes de producción. Validar también responsive y, cuando exista, correos de prueba.

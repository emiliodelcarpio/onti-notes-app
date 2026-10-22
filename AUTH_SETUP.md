# Autenticación en desarrollo

1. Copia los nombres de `.env.example` a `.env.local` y configura la URL y la clave pública de tu proyecto Supabase. Nunca utilices `service_role`.
2. Activa el proveedor Email con contraseña en Supabase Auth y configura la política de contraseñas (mínimo 8 caracteres; la aplicación admite hasta 128). No se utilizan OAuth ni enlaces mágicos para iniciar sesión.
3. En Auth → URL Configuration, configura Site URL con el origen de esta aplicación (por ejemplo, `http://localhost:3000` durante desarrollo) y añade `http://localhost:3000/auth/confirm?type=recovery` a Redirect URLs (o el equivalente del origen que utilices).
4. Para confirmar registros con cookies SSR, configura el enlace de la plantilla **Confirm signup** como `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
5. Para recuperación puedes conservar el enlace predeterminado `{{ .ConfirmationURL }}` de **Reset password**: el callback intercambia el código PKCE y dirige a `/update-password`. La plantilla personalizada con `token_hash` sigue siendo compatible. Consulta el diagnóstico de abajo para ambos formatos.
6. Mantén las confirmaciones de correo activadas al comprobar el flujo de verificación. Si se desactivan, Supabase puede crear una sesión inmediatamente; en ese caso, la protección de las rutas de acceso redirige al espacio personal.

Los registros y las solicitudes de recuperación muestran el mismo aviso tanto para direcciones nuevas como existentes y no exponen errores del proveedor. El aviso confirma la solicitud, no la entrega del correo; errores de rechazo o límites por dirección también mantienen una respuesta neutral. Usa los controles de frecuencia y protección contra abuso de Supabase.

Usa únicamente direcciones autorizadas y la configuración de pruebas de Supabase Auth; el servicio predeterminado no garantiza envíos a cualquier destinatario. No configures SMTP productivo. El trigger de perfiles debe estar instalado desde `squema.sql`.

## Diagnóstico de recuperación de contraseña

Si usas el correo predeterminado de Supabase, comprueba primero estos puntos:

1. **Destinatario autorizado:** la dirección debe pertenecer a un miembro de la organización, visible en Organization Settings → Team. Tener una cuenta en Authentication → Users no la autoriza automáticamente para recibir correos del servicio predeterminado. Para las pruebas, usa una dirección de un miembro existente del equipo; no hace falta invitar a usuarios de la aplicación a la organización.
2. **Cuenta de prueba en el proyecto correcto:** comprueba en Authentication → Users que la dirección utilizada tiene una cuenta con contraseña en el mismo proyecto al que apunta `NEXT_PUBLIC_SUPABASE_URL`. Una cuenta inexistente recibe deliberadamente una respuesta neutral y no se envía un correo.
3. **Límites de envío:** actualmente el servicio predeterminado permite 2 correos por hora para el proyecto, compartidos entre confirmación de registro, recuperación y otros envíos de Auth. Además, la recuperación tiene un intervalo predeterminado de 60 segundos por usuario. Consulta Authentication → Rate Limits y espera la ventana correspondiente antes de un único reintento; repetir solicitudes no elimina el límite.
4. **Código del fallo:** revisa los registros de Auth del proyecto y la terminal de `npm run dev`. Busca el intento de `/recover` en Supabase o `[auth.forgotPassword]` en la terminal. La aplicación registra únicamente código y estado en el servidor; no registra direcciones, contraseñas, mensajes completos ni tokens.

| Código o estado | Qué comprobar |
| --- | --- |
| `email_address_not_authorized` | La dirección no está autorizada para el servicio predeterminado. Usa la cuenta de prueba del equipo. |
| `over_email_send_rate_limit`, `over_request_rate_limit` o `429` | Límites del proyecto, de la dirección o de las solicitudes. Espera antes de repetir. |
| `captcha_failed` | Comprueba si activaste CAPTCHA: el formulario actual no integra un desafío CAPTCHA. |
| `email_provider_disabled` | Comprueba que el proveedor Email está habilitado en Auth. |
| `auth_error` con estado `0` o sin estado | No se obtuvo una respuesta utilizable; revisa conexión y disponibilidad de Supabase. |
| Estado `5xx` | Revisa los registros de Auth para identificar el fallo del servicio, de envío o de configuración. |
| Sin error | No garantiza que exista la cuenta ni que el correo haya sido entregado. Verifica los puntos anteriores y spam. |

Los rechazos que pueden depender del destinatario conservan un aviso público neutral para evitar revelar cuentas existentes. Los fallos de conexión, errores sin estado y fallos `5xx` muestran el error genérico y no se presentan como una solicitud completada.

**Cuando el correo llega pero termina en login:** el enlace predeterminado de Supabase verifica el token y vuelve a la aplicación con un `code` PKCE. Ese código debe intercambiarse por una sesión en un Route Handler antes de consultar la página protegida.

1. En Authentication → URL Configuration, mantén **Site URL** con el origen correcto (por ejemplo, `http://localhost:3000`).
2. Añade a **Redirect URLs** exactamente `http://localhost:3000/auth/confirm?type=recovery` para desarrollo. Si usas otro dominio, host o puerto, añade su equivalente exacto. La acción construye ese destino desde el origen de la petición y comprueba que coincide con Host o X-Forwarded-Host. No acepta un destino enviado en el formulario.
3. En **Reset password**, puedes conservar la plantilla predeterminada con este enlace:

```html
<a href="{{ .ConfirmationURL }}">Cambiar contraseña</a>
```

La acción ahora envía `redirectTo` explícito a `/auth/confirm?type=recovery`. Allí se ejecuta `exchangeCodeForSession`, se guardan las cookies de sesión y se redirige a `/update-password`. El destino final no acepta parámetros `next` ni URLs externas.

Para este flujo PKCE, abre el correo en el mismo navegador y origen donde solicitaste la recuperación: la cookie del verificador es necesaria. `localhost` y `127.0.0.1` son hosts distintos. Cambiar de navegador o borrar sus cookies impide completar este intercambio.

Si ya utilizas la plantilla personalizada con `token_hash`, sigue siendo compatible y verifica el token directamente, incluso desde otro navegador:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Cambiar contraseña</a>
```

Los enlaces anteriores que vuelven a `/?code=...` pasan primero al Route Handler de confirmación antes de consultar la sesión. El marcador de recuperación guardado con el verificador permite distinguirlos de las confirmaciones de registro. Los errores de verificación, códigos incompletos o caducados que recibe el callback terminan en `/auth/error`, con un mensaje seguro. Si Supabase devuelve un error antiguo en un fragmento `#error=...` hacia la raíz, el servidor no puede leer ese fragmento y puede seguir apareciendo el login; solicita un enlace nuevo con la URL de retorno configurada. Los enlaces usados o caducados no pueden repararse desde el código: solicita uno nuevo respetando los límites de envío. No se ha usado el token compartido para las comprobaciones locales.

No se necesita configurar SMTP productivo para estas pruebas. Referencias: [restricciones del correo predeterminado](https://supabase.com/docs/guides/auth/auth-smtp), [límites](https://supabase.com/docs/guides/auth/rate-limits), [códigos de error](https://supabase.com/docs/guides/auth/debugging/error-codes) y [respuesta neutral de recuperación](https://supabase.com/docs/guides/auth/passwords).

## Verificación manual

- Abre `/login`, `/register` y `/forgot-password` en móvil y escritorio, con teclado y con el tema del sistema claro/oscuro.
- Sin sesión, comprueba que esas tres rutas muestran sus formularios. Con una sesión válida, abre cada ruta directamente y mediante enlaces: deben redirigir a `/`, también con parámetros como `/login?registered=1`. La comprobación usa `getUser()` en el servidor antes de renderizar. Al cerrar sesión, las rutas deben volver a estar disponibles.
- Comprueba que `/auth/confirm?type=recovery&token_hash=...` sigue permitiendo llegar a `/update-password` con un enlace válido: la recuperación crea una sesión que se necesita para guardar la nueva contraseña, por lo que estas dos rutas no aplican el bloqueo de las vistas de acceso.
- Revisa validaciones de correo, campos obligatorios, longitud de contraseña y confirmación distinta. Comprueba que el botón se deshabilita mientras se procesa.
- Registra un correo autorizado y comprueba que se redirige a `/login?registered=1`, donde aparece el aviso «¡Registro completado!» con las instrucciones para revisar el correo y confirmar la cuenta. El botón debe permanecer deshabilitado también durante la navegación. Repite con una cuenta existente: la redirección y el aviso deben ser idénticos. Abre `/login` directamente y comprueba que no muestra ese aviso. Ante errores de validación o de conexión, el formulario debe mostrar el error sin redirigir.
- Abre la confirmación de correo y comprueba sesión y perfil automático.
- Comprueba que credenciales incorrectas, cuentas inexistentes y cuentas sin confirmar muestran el mismo error al iniciar sesión.
- Solicita recuperación con una cuenta autorizada, abre el enlace y guarda una nueva contraseña. Comprueba que puedes iniciar sesión con ella. Las solicitudes para cuentas inexistentes deben mostrar el mismo aviso.
- Comprueba enlaces caducados, incompletos y reutilizados: deben terminar en `/auth/error` sin detalles internos.
- Cierra sesión y comprueba que `/` vuelve a `/login`. Abre `/update-password` sin sesión: guardar debe fallar de forma segura.
- Comprueba fallos de conexión y errores del servidor. No incluyas tokens, contraseñas ni claves en capturas o registros.

Las comprobaciones de envío y del trigger requieren el proyecto Supabase configurado y no se ejecutan automáticamente.

Referencias: [Auth SSR](https://supabase.com/docs/guides/auth/server-side), [autenticación con contraseña](https://supabase.com/docs/guides/auth/passwords).

## Dashboard, perfil y apariencia

`squema.sql` documenta la estructura actual y sirve para una instalación nueva. `CREATE TABLE IF NOT EXISTS` no adapta una tabla existente: modificar el archivo local tampoco cambia Supabase. Para una instalación previa, revisa y ejecuta en SQL Editor, con un rol administrador, primero `migracion_profiles_created_at.sql` y después `migracion_profiles_theme.sql`. Ambas son idempotentes y no cambian RLS, permisos ni Storage; tampoco crean perfiles ausentes. La migración de fechas conserva los datos de `dated_at`, rellena fechas vacías con la creación de Auth o la fecha actual y reinstala el trigger de timestamps. Las fechas heredadas sin zona se interpretan como UTC: confirma que esa convención corresponde a tus datos antes de aplicarla.

La ruta `/` requiere sesión y muestra notas y recordatorios propios. Permite crear, editar y eliminar con confirmación, filtrar por tipo, estatus y prioridad, buscar y alternar entre tarjetas y columnas Kanban. Los recordatorios usan la zona horaria del navegador y guardan el instante en UTC; programarlos **no envía correos**. `profiles` no tiene una columna `timezone`.

En Kanban, arrastra el control de seis puntos de una tarjeta hasta la columna de destino. Funciona con ratón, táctil y lápiz; el borde resalta el destino y el tablero se desplaza al acercarse a sus extremos. Con teclado, enfoca ese control, pulsa Espacio o Enter, elige columna con las flechas y confirma con Espacio o Enter; Escape o Tab cancelan. El selector de estatus también sigue disponible. Soltar fuera del tablero o en el mismo estatus no guarda cambios. Mientras se guarda, los controles de estatus quedan bloqueados; la tarjeta cambia de columna cuando el servidor confirma. Si falla, conserva su estatus y muestra un error. Los filtros permanecen activos, por lo que una tarjeta puede dejar de mostrarse al salir del estatus filtrado.

El menú de cuenta permite editar el nombre visible (`full_name`) y el avatar HTTPS, cambiar contraseña, cerrar sesión y elegir claro, oscuro o sistema. La apariencia se guarda en `profiles.theme_preference` y en una cookie del servidor. Con sesión, el perfil es la fuente principal; la cookie conserva la selección en las vistas de acceso. El servidor establece el tema inicial en el HTML para evitar destellos del tema incorrecto. El valor inicial es `system`.

Los campos oficiales son `id`, `username`, `full_name`, `avatar_url`, `email`, `created_at`, `updated_at` y `theme_preference`. No se consultan ni escriben `display_name`, `timezone` ni `dated_at`. El correo visible y la identidad proceden de Supabase Auth; `profiles.email` es una copia heredada que no se sincroniza automáticamente y `username` no se utiliza para iniciar sesión. Las fechas las mantiene la base de datos.

## Si persiste el error al cargar preferencias

1. **Proyecto y columnas:** confirma que `.env.local` apunta al proyecto actualizado. En SQL Editor, revisa la estructura sin modificar datos:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

`theme_preference` debe ser `text NOT NULL DEFAULT 'system'`, con una restricción que permita únicamente `system`, `light` y `dark`. `created_at` y `updated_at` deben ser `timestamptz NOT NULL DEFAULT now()`. Si solo existe `dated_at`, migra su información a `created_at` sin perder fechas previas. No basta con reejecutar el `CREATE TABLE IF NOT EXISTS`.

2. **Fila del usuario:** busca en Table Editor una fila cuyo `profiles.id` coincida exactamente con el identificador de Authentication → Users. El trigger `on_auth_user_created`, que llama a `public.handle_new_user()`, solo cubre registros futuros; ni el esquema ni estas migraciones rellenan perfiles ausentes de cuentas anteriores. Cuenta los casos sin mostrar datos personales:

```sql
SELECT COUNT(*) AS users_without_profile
FROM auth.users AS auth_user
LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
WHERE profile.id IS NULL;
```

Si falta una fila, prepara una recuperación administrativa para el usuario afectado o un backfill explícito de los identificadores ausentes, con `ON CONFLICT (id) DO NOTHING` y los valores predeterminados del tema. No copies correos ni sustituyas perfiles existentes. Revisa el trigger antes de probar un registro nuevo. La aplicación no debe ocultar el problema creando un perfil desde el navegador.

3. **Permisos y RLS:** confirma que `public` está expuesto en Data API y que `authenticated` tiene `SELECT` y `UPDATE` sobre `profiles`. La política de actualización debe permitir la fila con `id = auth.uid()`. Revisa también el trigger de timestamps. Comprueba el acceso con una sesión normal de la aplicación: el SQL Editor como administrador no demuestra que RLS permita la operación. El esquema heredado mantiene lectura pública de perfiles, incluido `email`; no debe asumirse aislamiento de perfiles y cualquier endurecimiento requiere una migración explícita.

4. **Caché de esquema:** si la columna ya existe pero la API todavía indica que no la encuentra, solicita en SQL Editor la recarga de PostgREST y vuelve a intentar:

```sql
NOTIFY pgrst, 'reload schema';
```

Esto actualiza la caché de metadatos de la API; no crea columnas ni modifica filas. Consulta la [documentación de PostgREST sobre la caché de esquema](https://docs.postgrest.org/en/v14/references/schema_cache.html).

5. **Código del fallo y reintento:** revisa `[profile.load]`, `[profile.update]` o `[profile.theme]` en la terminal del servidor. Solo registran motivo, código y estado HTTP; nunca mensajes completos del proveedor, correos, identificadores ni tokens.

| Motivo o código | Qué comprobar |
| --- | --- |
| `42703` o `PGRST204` | Columnas del esquema y caché de PostgREST. |
| `42501`, `401` o `403` | Sesión, permisos y políticas RLS con las credenciales normales del usuario. |
| `missing_profile` | La fila del usuario puede faltar o estar oculta por RLS. |
| `invalid_theme` | El valor guardado no es `system`, `light` ni `dark`. La interfaz usa sistema y permite volver a guardar esa misma opción para repararlo. |
| `unexpected_error` o código `unknown` | Conexión, configuración y disponibilidad del servicio. |

La consulta del dashboard pide únicamente `id`, `full_name`, `avatar_url` y `theme_preference`; no depende del correo heredado ni de las fechas del perfil. Tras corregir el problema, recarga el dashboard, elige un tema y vuelve a cargar: la fila debe conservar `theme_preference` y el aviso debe desaparecer. Si compartes un diagnóstico, incluye únicamente motivo, código y estado.

Comprobaciones manuales pendientes en el proyecto Supabase:

- Verifica que el registro crea un perfil y revisa por separado las cuentas anteriores. Edita el perfil y recarga: deben conservarse `full_name`, avatar y apariencia; `created_at` debe permanecer estable y `updated_at` cambiar tras la edición.
- Prueba los tres temas, la recarga y el cierre e inicio de sesión. En sistema, cambia la apariencia del dispositivo; en los temas manuales debe conservarse la elección.
- Crea y edita notas con los cinco colores, prioridades y estatus. Comprueba filtros, búsqueda, tarjetas y Kanban; cancela una eliminación y confirma otra. Revisa los estados vacío, carga y error.
- En Kanban, mueve notas y recordatorios a columnas vacías y ocupadas, también hasta Archivado usando el desplazamiento del tablero. Recarga para comprobar persistencia. Prueba ratón, táctil, teclado, Escape, soltar fuera y mismo estatus; esos casos de cancelación no deben guardar. Con conexión lenta, comprueba el bloqueo de envíos repetidos; con un fallo del servidor, verifica que la tarjeta conserva el estatus. Repite con filtros activos y ambos temas.
- Programa y reprograma un recordatorio futuro desde un navegador con una zona horaria distinta de UTC. Comprueba la hora mostrada, su instante UTC en Supabase y la validación de fechas pasadas. No esperes un correo.
- Con dos cuentas autorizadas, comprueba que cada una solo ve y modifica sus propias notas y solo puede editar su propio perfil. Repite consultas y modificaciones con las credenciales normales de cada cuenta para verificar RLS; una sesión administradora del SQL Editor no sirve para demostrar el aislamiento. La política heredada de perfiles permite lectura pública, por lo que esta comprobación no debe afirmar privacidad del perfil.
- Comprueba cambio de contraseña, logout, teclado y vistas móviles en ambos temas. Durante cada operación, el botón debe indicar carga y evitar envíos dobles.

Estas comprobaciones requieren Supabase configurado; esta guía no afirma que el CRUD real, el trigger o el aislamiento entre cuentas ya se hayan verificado.

## Diseño de las vistas de autenticación

Las cuatro vistas comparten la tarjeta compacta, el encabezado horizontal y los tokens de color del mockup. El tema inicial sigue la preferencia del sistema; desde una cuenta autenticada se puede elegir y recordar claro, oscuro o sistema. El modo oscuro utiliza superficies neutras y botones lavanda; el modo claro conserva la misma jerarquía.

El modo claro utiliza fondo frío, tarjetas blancas con sombra suave, iconos índigo sobre lavanda y botones con degradado. Los estados deshabilitados tienen colores propios para mantener legible el texto; errores y confirmaciones usan superficies semánticas de rojo y verde. Los bordes de los campos y los textos se ajustan para conservar el contraste. Cuando está seleccionado sistema, la preferencia clara del dispositivo activa esta variante automáticamente, también si cambia con la página abierta.

- Los campos muestran errores al salir de ellos o intentar enviar. El primer campo inválido recibe el foco; el botón permanece deshabilitado mientras haya errores visibles o una operación pendiente. La validación del servidor se mantiene.
- Los campos de contraseña permiten mostrar u ocultar el valor y el campo de nueva contraseña ofrece una orientación de longitud y variedad. La barra es informativa: no cambia el mínimo de 8 caracteres ni garantiza seguridad.
- Los éxitos de inicio de sesión y registro usan un toast que permanece durante la navegación, se cierra manualmente o a los 8 segundos y pausa su cierre al pasar el cursor o recibir foco. El registro conserva además las instrucciones de verificación visibles en el login.
- Los errores del servidor y los avisos de recuperación o contraseña actualizada permanecen en el formulario. Los mensajes de correo conservan su neutralidad y no garantizan entrega.

Para revisar el diseño, comprueba los cuatro formularios vacíos, con datos, con errores, cargando y con respuesta de éxito; verifica teclado, botones de visibilidad, cierre del toast, preferencia de movimiento reducido y adaptación a pantallas estrechas. No uses solicitudes reales repetidas para probar la apariencia de los estados de envío.

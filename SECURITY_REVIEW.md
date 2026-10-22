# Revisión de seguridad — 22 de octubre de 2026

La revisión cubre el código y la configuración local. No certifica ausencia absoluta de vulnerabilidades ni sustituye las comprobaciones del proyecto y del despliegue.

## Hallazgo prioritario: perfiles accesibles sin sesión

Una solicitud anónima HEAD contra `profiles`, usando únicamente la clave publicable, respondió 206 con filas visibles. No se descargaron filas, correos ni notas. El esquema heredado concede SELECT público sobre toda la tabla, incluido `email`. Una comprobación equivalente de `notes` fue rechazada con 401.

**Acción necesaria:** revisar y ejecutar `migracion_seguridad_datos.sql` en el SQL Editor del proyecto. La migración no borra filas ni columnas. Revoca los permisos heredados, deja al usuario leer únicamente los campos de su perfil usados por la app, editar nombre/foto/tema, y conserva el alta automática mediante el trigger de Auth. Añade restricciones por propietario para perfiles y notas, incluso frente a políticas permisivas anteriores. Reejecutar el archivo es seguro.

Después, las cuatro comprobaciones de permisos al final del archivo deben devolver false. Repetir el acceso anónimo y comprobar aislamiento con dos cuentas de prueba autorizadas mediante la Data API y sus sesiones normales: no basta con el SQL Editor como administrador ni con que la interfaz filtre por usuario.

La migración se preparó localmente y **no se ejecutó en Supabase**. Hasta aplicarla, la exposición de perfiles puede persistir en el proyecto remoto. Las instalaciones nuevas reciben las mismas reglas en `schema.sql`. Si faltan campos de fechas o tema, ejecutar primero sus migraciones existentes.

## Conexiones, identidad y navegador

- Los clientes usan la clave `sb_publishable_` y HTTPS. HTTP solo se admite para Supabase local en desarrollo. La configuración se valida también antes de compilar para impedir que una clave privilegiada termine en los archivos públicos.
- La clave publicable y el identificador del proyecto no son secretos. Su protección depende de permisos y RLS; rotar esa clave no corrige una política pública. No se utiliza `service_role` para operaciones del usuario. [Referencia de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
- Las Server Actions de datos verifican `getUser()` y obtienen el propietario en el servidor. `getSession()` se usa solo para comprobar limpieza después de recuperar contraseña, no para autorizar.
- Las utilidades de servidor tienen barreras `server-only`. Solo se pasan al navegador los campos necesarios; no se serializa el cliente Supabase, una sesión completa ni credenciales administrativas.
- Cookies: `Secure` en producción y `SameSite=Lax`. El SDK SSR comparte las cookies con su cliente de navegador; no se fuerza HttpOnly indiscriminadamente. La cookie del tema ya es HttpOnly. [Guía SSR oficial](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
- Los formularios de Auth rechazan campos inesperados o duplicados. Los errores de acceso y recuperación conservan mensajes neutros. La recuperación exige origen HTTPS en producción y redirige a destinos fijos de la aplicación.
- Se añadieron `nosniff`, `Referrer-Policy: no-referrer`, protección contra incrustación y una CSP limitada a frames, base, objetos y envío de formularios. Esta CSP no debe presentarse como protección completa contra XSS. Las notas se renderizan como texto React, sin `dangerouslySetInnerHTML`.
- Las páginas protegidas siguen siendo dinámicas y no usan ISR ni una caché global de usuarios. `React.cache` solo comparte la consulta dentro de la petición. Comprobar también que ningún proxy/CDN personalizado cachee respuestas autenticadas o Set-Cookie.

## Fotos y registros

Mantener aplicada `migracion_avatars_storage.sql`: bucket privado, carpeta y propietario propios, archivos de hasta 2 MiB y formatos permitidos. El servidor valida el archivo y guarda una ruta, no una URL firmada. Las firmas duran una hora y son credenciales temporales de lectura: no copiarlas a registros, incidencias o analítica. Los fallos registran únicamente motivos/códigos, nunca emails, contraseñas, claves ni respuestas completas del proveedor.

Las URL HTTPS de avatares heredados siguen funcionando por compatibilidad y pueden contactar con ese servidor externo desde el navegador. Se envían sin Referer; sustituirlas por una subida al bucket elimina esa dependencia externa.

## Secretos y dependencias

El escaneo de archivos rastreados no encontró claves Supabase privilegiadas, JWT de service_role, claves privadas ni tokens GitHub coincidentes con los patrones revisados. `.env.local` está ignorado y no apareció en el historial de archivos de entorno/llaves; solo `.env.example` está rastreado y contiene nombres sin valores. Este escaneo por patrones no certifica todo secreto posible ni copias externas del repositorio.

`npm audit --omit=dev`: 0 avisos conocidos. `npm audit` completo: 5 avisos altos en una cadena de herramientas de desarrollo (`eslint-config-next` → `fast-glob` → `micromatch` → `braces`), originados en CVE-2026-93687. El aviso no publica parche a esta fecha y describe denegación de servicio por patrones profundamente anidados, no una filtración de datos. No se forzó la bajada de Next/ESLint a otra versión mayor. Evitar patrones/repositorios no confiables en CI y actualizar al publicarse una solución compatible. [Aviso](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Verificación pendiente del despliegue

La compilación de producción, ESLint y TypeScript pasaron. Las comprobaciones locales validaron 15 casos de configuración, 25 formularios malformados sin consultas, respuestas neutras de Auth, autorización previa al cambio de contraseña y cierre de la sesión de recuperación. Se comprobó en el servidor local de producción la presencia de las cuatro cabeceras añadidas, la ausencia de `X-Powered-By` y `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` en el dashboard.

Las regresiones de navegador cubrieron creación/edición/eliminación, perfil/avatar, cambio de contraseña con sesión conservada y recuperación terminada en login. Los casos de paginación y 26 escenarios del backend de avatares también pasaron con datos simulados. El SQL recibió comprobaciones estructurales de consistencia con el esquema, pero no se ejecutó contra PostgreSQL. Los resultados locales no confirman los permisos remotos ni los ajustes de Vercel.

1. Aplicar la migración de privacidad de datos y comprobar los permisos resultantes. Verificar por separado Storage con dos cuentas autorizadas.
2. Volver a desplegar en Vercel; confirmar URL HTTPS, cabeceras y respuestas privadas/no-store del dashboard. No publicar variables secretas con prefijo NEXT_PUBLIC.
3. Revisar en Supabase las Redirect URLs de Auth: únicamente orígenes propios necesarios, confirmación de email, límites y controles de abuso. La comprobación pública de Auth confirmó email habilitado y confirmación requerida; no accede a la lista administrativa de redirecciones ni a otros ajustes privados.
4. Probar login, logout, recuperación, perfil, subida de foto y CRUD con las credenciales normales de las cuentas de prueba. No compartir cookies/JWT para pedir ayuda.

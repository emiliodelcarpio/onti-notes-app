
He detectado un pequeño tema de redireccionamiento al actualizar la contraseña dentro del proceso de recuperación de contraseña. Justo en el momento en que le damos a actualizar contraseña, después de ingresar la nueva contraseña, el sistema no redirige al inicio de sesión. Valida este punto y ajusta para que ese proceso termine en el login.


----------------------------------------------------------------


Vamos a optimizar el rendimiento del Dashboard cuando el usuario tenga más de 10 notas guardadas. Implementa una carga dinámica o paginación para traer las notas en bloques de 10 en 10, incluyendo un indicador de carga para mantener fluida la interfaz.


----------------------------------------------------------------


Vamos a mejorar le experiencia de usuario eliminando el botón de carga dinámica e implementando esta carga de forma automática cada vez que el usuario llegué al final de la lista. Entendiendo que, para el caso de la vista kanban, vamos a ajustarla de tal manera que la vista cargue al menos 3 notas por cada columna si es que las hay, para que realmente tengamos notas visibles en la pantalla. Esto nos llevará considerar que para esa vista específica el límite no serán 10 notas por cada carga (pueden ser más).
Resumen:
- Eliminamos botón de carga y automatizamos al scrolling.
- Dashboard vista general, cargamos de 10 en 10.
- Vista kanban, cargamos al menos 3 notas por estatus.
- Mantenemos carga dinámica en ambas vistas.


----------------------------------------------------------------


Ahora vamos a trabajar con el ajuste para que la subida de la imagen para avatar no sea a través de un enlace, y quede implementado usando el bucked de SUPABASE. Vamos a ajustar esto para que la edición dela foto sea un proceso separado pero que se parte de la vista de edición del usuario.
Quiero que trabajes conmigo como un Arquitecto de Software Senior especializado en Next.js (App Router), TypeScript y Supabase. Tu papel será guiarme, darme sugerencias de buenas prácticas de diseño de software y ayudarme a dejar las reglas claras antes de programar.
Para empezar, ayúdame a armar nuestro archivo CLAUDE.md para la raíz del proyecto. Debe incluir el stack tecnológico, reglas de código para mantenerlo limpio y sin tipos raros, la arquitectura de carpetas que vamos a usar y los comandos principales para correr y validar el proyecto.


----------------------------------------------------------------


Para mantener este MVP simple, directo y alineado a mi arquitectura, no usaremos la carpeta src/ ni la estructura features/. Tampoco agregaremos frameworks de testing como Vitest o Playwright por ahora.

Nuestra estructura de carpetas oficial en la raíz será:
- app/ (Rutas y vistas de Next.js)
- actions/ (Server Actions / Controllers)
- components/ (UI)
- lib/ (Supabase client/server)
- types/ (TypeScript)

Reescribe el CLAUDE.md respetando estrictamente esta estructura y manteniéndolo conciso.

También te comparto que en los archivos adjuntos encontrarás un archivo pdf que podemos usar de referencia sobre las necesidades que buscamos cubrir en esta aplicación.


----------------------------------------------------------------


Ok, veo que agregaste varios detalles del PDF. Este PDf únicamente lo tomaríamos de referencias para los temas específicos que acontecen al código y funcionalidades de la app, no a las responsabilidades que incluyen a lo que concierne a entregables y cómo ejecutar la forma de trabajo con la IA. Además también te cuento que vamos a trabajar con Tailwind. Ajusta el CLAUDE.md


----------------------------------------------------------------


Tengo una duda de cómo maneja Next.js los componentes. Revisando un ejemplo, vi que en la vista de perfil no hizo falta poner 'use client', pero en el dashboard sí fue necesario porque usaba un hook de autenticación (useAuth).
¿Por qué pasa esto exactamente? Y dime si usar este useAuth en el cliente es lo que nos ayuda a que si el usuario tiene dos pestañas abiertas y hace un cambio en una, la otra se refresque bien. Con lo que me expliques, agregemos una regla clara en el CLAUDE.md sobre cuándo sí usar 'use client' y cuándo no.


----------------------------------------------------------------


En proyectos anteriores con el modelo MVC tradicional, siempre dividíamos el código por capas. Estuve viendo que en Next.js se acostumbra mucho usar una carpeta /actions en la raíz para meter ahí la lógica de backend usando Server Actions.
Explícame de forma sencilla cómo esta carpeta /actions toma el papel de los controladores y qué ventajas nos da organizar el proyecto así.


----------------------------------------------------------------


Perfecto!

Ahora vamos a sumar a tus habilidaes el rol de un Lead UX/UI Designer experto en Tailwind CSS y diseño de interfaces. Ojo: está habilidad se incorpora, no te limita. No quiero que la aplicación se vea plana o vacía, así que vamos a definir las reglas visuales y de interacción para nuestro CLAUDE.md:
1. Que los botones muestren cuando algo se está cargando para evitar clics dobles.
2. Que si no hay notas guardadas, se muestre un mensaje o pantalla amigable (empty state) en lugar de dejar la pantalla en blanco.
3. Que pida confirmación antes de borrar una nota a través de ventanas modales. Asegúrate de no usar alerts.
4. Soporte para modo claro y modo oscuro (Dark & Light Mode), permitiendo que sea automático según el sistema o con opción de cambiarlo manualmente.
5. Vamos a mantener formularios estilizados y enfocados en la facilidad de uso.
6. Asegúrate que todo el diseño esté enfocado en brindar al usuario final una experiencia, minimalista, simple y enfocado en el objetivo de la aplicación: Gestionar notas y recordatorios. Sin embargo, también debes asegurarte de que tener un esquema premium, usando fuentes, colores y detalles adecuados.

Ajusta el CLAUDE.md


----------------------------------------------------------------


Ahora agreguemos una nueva skill para ti como un Lead Full-Stack Engineer para definir las características y el modelo de datos de las notas antes de crear la base de datos en Supabase.

Recuerda, cada una de estas habilidades no sustituye a la otra, ni te limita. Se suma a tu stack de posibilidades.

Para esta aplicación necesitamos que el usuario use su correo electrónico o bien su usuario para logearse, vamos a mantener ambos. También vamos a agregar el created_at que normalmente supabase no las genera.

Vamos a agregar al CLAUDE.md los campos que llevará cada nota:
- Tipo: Nota normal o Recordatorio.
- Importante que cuando tenemos un recordatorio podamos configurarle una fecha y hora específica para enviar un correo.
- Prioridad: Baja, Media o Alta.
- Estatus basado en un tablero tipo Kanban: Backlog, Pendiente, En Proceso, En Revisión, En Espera, Completado y Archivado.
- Color personalizado: Opción para elegir color (vamos a dejar 5 opciones únicamente), pero evitando blanco y negro puros para mantener buen contraste tanto en modo claro como oscuro.

De cualquier manera agregaremos más adelante el sql correspondiente a las tablas que vamos a generar en supabase dentro de nuestro directorio raíz del proyecto para que siempre disponibles para el modelo de datos.

Ajusta el archivo CLAUDE.md con lo que consideres importante en este punto. Recuerda no estamos generando aún los modelos para supabase.


----------------------------------------------------------------


Atendiendo a las consideraciones del punto 3. Vamos a dejar el login y registro de usuario únicamente con correo electrónico por esta aplicación. 

En cuanto al tema de recordatorios, este tendrá sentido aplicarlo con un recordatorio vía correo? Es decir, supabase nos da el soporte para hacerlo en la versión gratuita?


----------------------------------------------------------------


Antes de avanzar vamos a ajustar un tema sobre los correos. Vamos a dejarlo específicamente para pruebas. La aplicación no entrará a producción por ahora. Ajusta el CLAUDE.md si lo requieres.


----------------------------------------------------------------


Listo!

Ahora ya tienes el archivo CLAUDE.md en la biblioteca de nuestras referencias para que dispongas de él cuando sea necesario para avanzar con este proyecto.

El siguiente paso en el que nos vamos a enfocar es, el desarrollo del sql que vamos a requerir para implementar la base de datos en supabase. 

Para esto suma a tus habilidades amplio conocimiento y experiencia en el manejo de postgresql y supabase RLS.

Escribe el script SQL completo para el archivo schema.sql de nuestrpo MVP en supabase, basándote en las específicaciones de nuestro archivo maestro.

Devuelve únicamente el script SQL completo listo para copiar y ejecutar en el SQL editor de supabase y guardar en schema.sql en la raíz del proyecto.


----------------------------------------------------------------


Veo que no hemos considerado agregar la tabla profiles. Vamos a agregarla y ajustar lo necesario para que la aplicación tenga mayor alcance a largo plazo.

Ajusta el archivo CLAUDE si es necesario.


----------------------------------------------------------------


Ahora vamos a concentrarnos en el diseño de cada ventana considerando los detalles de nuestro archivo de referencia.

Genera las vistas relacionadas al login, crear cuenta, recuperación de contraseña, actualización de contraseña. Recuerda que necesitamos cuidar la experiencia de usuario. Por ahora te comparto las pantallas que tenemos generadas para que las uses de referencia (no limitativas).


----------------------------------------------------------------


Genera las imágenes de cada estado del formulario.

----------------------------------------------------------------


Pasemos ahora al diseño con el dashboard. Vamos a mantener un diseño limpio y premium como lo hemos hecho con las vistas de login y secundarias. Recuerda mantener el estilo, toma como referencia el dark mode para generar este diseño.

Para este diseño vamos a incluir un pequeño iconoc en la esquina superior izquierda y en la esquina superior derecha vamos a colocar el espacio para el avatar del usuario, junto a su nombre si ya está configurado.

El resto de la pantalla deberá contener las notas / recordatorios guardados hasta el momento. En caso de que el usuario no tenga notas agregadas, este espacio no deberá simplemente ser un espacio vacio, vamos a darle una experencia diferente. Crea la vista en una imagen


----------------------------------------------------------------


Elimina el menú de la izquierda, deja únicamente el nombre con el ícono. Ajusta el ícono a una nota.
Configuración y ayuda la enviaremos al menú desplegable del perfil (superior derecha).
También vamos a agregar un filtro para los estatus y prioridad de las notas/recordatorios.
Elimina las tres opciónes de la parte inferior.


----------------------------------------------------------------


El menú de la esquina superior derecha, mostrará las siguientes opciones: perfil, contraseña, tema claro/oscuro/automático y cierre de sesión.

Vamos a trabajar, en las vista de vista del perfil, donde también habilitaremos de forma asincrona la actualización de los datos del usuario. Buscamos que este sea un espacio en el que para editar los datos no cambiemos de pantalla.


----------------------------------------------------------------


Vamos a trabajar estos diseños para separarlos en momentos. Por ahora vamos a concentrarnos en el dieño de la vista para ver el perfil. Este diseño debería presentar de primera mano los datos NO EDITABLES y mostrar al usuario un botón de EDICIÓN, que al hacer nos muestre una ventana modal con el formulario de edición. Trabajemos entonces en estos dos diseños. La vista general del perfil y la vista de la ventana modal.


----------------------------------------------------------------
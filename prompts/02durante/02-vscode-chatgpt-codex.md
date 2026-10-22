Siguiendo estrictamente las reglas de nuestro CLAUDE.md, construye el módulo de autenticación completo para Next.js App Router con Supabase Auth
Necesito los siguientes archivos:
1. actions/auth.ts: Server Actions para login, register, forgotPassword y logout. Las Server Actions deben validar las entradas, manejar errores de Supabase con try/catch y devolver un objeto { success: boolean, error?: string }.
2. components/auth/LoginForm.tsx: Componente de cliente ('use client') con campos de correo y contraseña, estado de pendiente/carga en el botón para evitar clics dobles, feedback de error legible y enlace a registro/recuperación.
3. components/auth/RegisterForm.tsx: Componente de cliente con correo, contraseña y confirmación de contraseña, más el manejo del aviso de verificación de correo.
4. components/auth/ForgotPasswordForm.tsx: Formulario para solicitar el enlace de recuperación de contraseña.
5. Rutas en app/: Vistas correspondientes para /login, /register y /forgot-password.
   Recuerda: la autenticación es únicamente con correo y contraseña, y los mensajes de error no deben revelar si una cuenta existe o no por seguridad.


   ----------------------------------------------------------------


Vamos a comenzar a realizar correcciones. El primer punto que vamos revisar es el proceso justo después de crear una cuenta. Ahora mismom observo que el sistema no  muestra un mensaje de confirmación donde la cuenta ha sido creada y que se debe revisar el correo de confirmación. Vamos a mejorar esto para brindar una experiencia de usuario adecuada.
Mostremos un mensaje donde confirmamos la creación de la cuenta y redireccionemos al login.

   
   ----------------------------------------------------------------


   Bien, vamos enfocarnos en el proceso de recuperación de contraseña. El correo no está llegando. Revisa los posibles errores que podemos tener en nuestra configuración de código y si es necesario validar algunos detalles en SUPABASE hazme saber para realizar las acciones necesarias.


   ----------------------------------------------------------------


   429: email rate limit exceeded
    El problema radica en los límites de correos en SUPABASE. Ese es el estatus de nuestro evento en el log.


   ----------------------------------------------------------------


   Entendido. Avancemos con estilización de las vistas. Vamos a implementar el uso iconos en donde existen textos explicativos o en las secciones donde es necesario que el usuario pueda ver un gráfico relativo al texto que se presenta. Trabaja en ello.


   ----------------------------------------------------------------


   Observo que una vez que hemos iniciado sesión en la aplicación las rutas login, register o recover password siguen siendo accesibles vamos a bloquearlas cuando hemos iniciado sesión.



   ----------------------------------------------------------------


   Vamos a realizar ajustes al diseño con el mockup de la imagen. Ajusta cada vista de login, forgot password, update password y create account.
   Sería una muy buena idea usar mensajes en toast si eso mejora la experiencia de usuario.


   ----------------------------------------------------------------


   He detectado que en el proceso para recuperación de contraseña, el enlace que nos llega por correo (https://gjlqqbkexjluqmiicqpa.supabase.co/auth/v1/verify?token=pkce_702553f4f98de7a268c7897cc52028008be87005dffde14b8d6af67a&type=recovery&redirect_to=http://localhost:3000) no nos lleva al formulario para actualizar la contraseña, en su lugar nos lleva al formulario de login. Valida cuál es el error y si es posible corregirlo desde nuestro código, hazlo. Si el problema está en la configuración de SUPABASE, también índicame


   ----------------------------------------------------------------


   Bien, ahora, te quiero compartir las vistas en light mode, para que realices los ajustes necesarios para cuando esta configuración este habilitada y la tengamos lista para funcionar.


   ----------------------------------------------------------------


   Vamos a trabajar ahora con el dashboard, que es la primera pantalla que el usuario ve cuando inicia sesión. Vamos a generar los actions, los componentes que podemos reutilizar y la vista correspondiente. Toma como referencia el diseño que te adjunto en la imagen. Asegúrate de trabajar también en la versión ligth mode para que esté disponible para el usuario en el menú desplegable de la esquina superior derecha, donde también tendrá acceso a la edición de su perfil, su contraseña y el logout. Si consideras que es necesario agregar algo más hazlo.


   ----------------------------------------------------------------


   Veo que estaos mostrando un error en la carga de algunas preferencias, este error es referente a la configuración del modo dark/light?


   ----------------------------------------------------------------


   Encontré inconsistencias en nuestro modelo de datos registrado en SUPABASE, debido a que el SQL ejecutado para crear la tabla profiles no coincidía con lo que teníamos definido en nuestro SQUEMA.sql además de que observar que en la tabla profiles no teníamos registrado el campo para almacenar las preferencias de estilo del usuario.
Ahora mismo ya actualicé los archivos base de SQUEMA.sql y CLAUDE.md.
Ajusta todo lo necesario y optimiza para que podamos usar las preferencias y no tengamos el error. Si el error persiste indicame lo que debemos revisar.



   ----------------------------------------------------------------


   VAmos a trabajar en una nueva función del dashboard, específicamente en el apartado de la vista en columnas filtradas por estatus para las notas y recordatorios. Vamos a agregar la posibilidad de cambiar de estatus a través de arrastrar y soltar.
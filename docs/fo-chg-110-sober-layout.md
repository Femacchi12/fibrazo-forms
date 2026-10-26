# FO-CHG-110 — Interfaz sobria y contraste de puntos

Versión propuesta: 0.8.163. Base y reversión: 627638479165fe9eb700397fc2990fe9f7ee0769 / producción 0.8.162.

Se restauran bordes blancos en círculos/cuadrados y halo en triángulos, sin alterar colores ni clasificación. Mi cuenta usa métricas alineadas, acciones compactas y controles originales. Reportes y Administración usan superficies planas, separadores de sección y conservan límites visibles en campos/acciones; permisos y estados de cambios sin guardar permanecen. El encabezado identifica Formularios. Los detalles de formularios conservan su botón en la tercera columna y expanden contenido en segunda fila sin desplazar el control.

Sin cambios de datos, APIs, sincronización, autenticación ni reglas. Se conserva Montserrat/Poppins y paleta institucional. Se renueva caché de shell para la versión.

Validación: suite completa npm run test:forms aprobada, git diff --check aprobado. Revisión visual pendiente de preview; no presentar esta nota como evidencia de publicación.

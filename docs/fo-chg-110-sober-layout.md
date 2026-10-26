# FO-CHG-110 — Interfaz sobria y contraste de puntos

Versión: 0.8.163. Base y reversión: 627638479165fe9eb700397fc2990fe9f7ee0769 / producción 0.8.162.

Se restauran bordes blancos en círculos/cuadrados y halo en triángulos, sin alterar colores ni clasificación. Mi cuenta usa métricas alineadas, acciones compactas y controles originales. Reportes y Administración usan superficies planas, separadores de sección y conservan límites visibles en campos/acciones; permisos y estados de cambios sin guardar permanecen. El encabezado identifica Formularios. Los detalles de formularios conservan su botón en la tercera columna y expanden contenido en segunda fila sin desplazar el control.

Sin cambios de datos, APIs, sincronización, autenticación ni reglas. Se conserva Montserrat/Poppins y paleta institucional. Se renueva caché de shell para la versión.

Validación: suite completa npm run test:forms aprobada, git diff --check aprobado. QA visual sintética aprobada en preview fcfc3c556b7b6107d08b0298216c507cf0e7377a: escritorio, menú de cuenta, Reportes, Administración y viewport móvil 390×844. Ver detalles conserva coordenadas al abrir/cerrar: escritorio x1090.5/y136; móvil x266/y217. Escenario QA no incluido en el árbol de producción. Validación con sesión real y teléfono físico pendiente de Edu. Publicación se verifica por separado con Vercel y HTTP.

Producción verificada 26/10/2026: b5dbec3886132557471c0285e5122cc7a4068efc, dpl_E5iFwQF53DtbC2o4Waat5hEqWghw READY, alias https://fibrazo-forms.vercel.app/ sin error. HTTP 200 y bytes exactos de versión, HTML, CSS y service worker; fixture QA 404; catálogo no autenticado 401. Navegador conserva puerta de Google y URL Solo mapa. Consulta inicial de errores/fatal sin grupos; ventana de observación corta. Manuales nativos Forms y Exploración actualizados. Reversión a 0.8.162 disponible.

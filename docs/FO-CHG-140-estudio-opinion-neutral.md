# FO-CHG-140 — Estudio de opinión: convocatoria neutral

Fecha: 2026-11-18. Estado: implementación en repo (producción requiere verificación READY y envío E2E).

## Alcance y continuidad
- **No reemplazar** `/focus-group`, API ni base originales.
- Crear segunda invitación pública en `/estudio-opinion` mediante archivo `estudio-opinion.html`.
- Identidad exclusivamente «Estudio de opinión» en encabezado/título, sin logos comerciales ni paleta de operadores. Tema lavanda grisáceo `#b9afcf` y fondos antracita violáceos, favicon `estudio-opinion-icon.svg`.
- Se mantienen requisitos, convocatoria de Cartagena del 28–29 de noviembre de 2026, incentivo de COP $100.000, sede propuesta Las Gaviotas, cuestionario de cuatro etapas, celular colombiano repetido, correo opcional, aviso de confirmación telefónica, botones de copiar/compartir, GPS opcional y validación de datos.
- La lista de proveedores no exhibe FIBRAZO; posibles coincidencias de clientes FIBRAZO deberán filtrarse durante selección telefónica. No modificar la encuesta original.
- Única identificación necesaria del organizador en la página neutral: **responsable del tratamiento FIBRAZO S.A.S.**, en el consentimiento de datos personales, con vínculo a su política. La URL de alojamiento `fibrazo-forms.vercel.app` también revela el operador; neutralidad plena de dominio requeriría una URL/dominio distinto y configuración adicional.

## Backend y separación
- Reutiliza `api/public.js` (sin añadir Serverless Functions al plan Hobby) por rewrite `/api/estudio-opinion → /api/public?opinion=1`.
- Módulo independiente `api/_estudio-opinion.js`. Datos almacenados en pestaña distinta `RESP_ESTUDIO_OPINION_2026` de la base operativa corporativa; prefijo de identificación `EO-`.
- Estado independiente de publicación en `Y1:Y2` de la hoja de respuestas, con `PUBLIC_ENABLED`. Se crea al primer acceso si la pestaña no existe.
- Consultar estado `GET /api/estudio-opinion?config=1`; cambiar estado mediante `POST /api/estudio-opinion?manage=1`, solo administrador base verificado con token Firebase. El backend rechaza envíos cuando la versión neutral está cerrada.
- Nuevo acceso en la lista de formularios del dashboard y tarjeta propia de publicación en «Administrar». No cambiar permisos, datos o acceso del Focus Group original.
- La investigación debe preservar privacidad, minimización, transparencia de consentimiento y acceso restringido a respuestas.

## Comprobaciones necesarias
1. Confirmar Vercel READY en el commit final y alias de producción.
2. Abrir URL pública en móvil/escritorio; revisar contenidos, textos legales, navegación y colores.
3. Probar la creación de la pestaña nueva mediante consulta pública y confirmar que la original no cambió.
4. Probar inscripción sintética marcada de prueba, comprobar hoja separada y evitar conservar datos falsos en reclutamiento.
5. Probar activar/desactivar desde Admin, verificar cierre de página y rechazo POST.
6. Verificar eventuales alertas por correo por separado. El script anterior de correo de Focus Group no cubre automáticamente esta nueva pestaña.

## Incidencia corregida — 2026-11-19
- Síntoma: al abrir `/estudio-opinion`, algunos navegadores con PWA previamente instalada mostraban el dashboard en vez del formulario.
- Causa identificada: `service-worker.js` interceptaba todas las navegaciones locales salvo `/focus-group`, y resolvía otras rutas como `/` desde el caché de la aplicación.
- Solución: agregar `/estudio-opinion` a las rutas que el Service Worker no intercepta y renovar la versión del caché a `v0.8.193-20261119-opinion-navigation141`.
- No se modificaron la encuesta original, el almacenamiento ni el control de publicación.
- QA de publicación: comprobar Vercel READY para el commit de código; realizar prueba real de apertura en navegador con PWA antigua y en sesión nueva.

## FO-CHG-142 — Ampliación de perfil y estratos (19/11/2026)

**Alcance:** solo versión neutral `/estudio-opinion`. Se conserva sin cambios la versión original `/focus-group`.

- Estrato declarado de la vivienda: nueva pregunta obligatoria `estratoVivienda`, valores 2 a 6.
- Estrato en la factura de energía eléctrica de Afinia: pregunta obligatoria `estrato`, valores 2 a 6; se mantiene en la columna histórica J «Estrato factura energía».
- Tipo de ingresos: nueva pregunta voluntaria `tipoIngresos` en paso 3, opciones Fijos, Variables, Mixtos o vacío («Prefiero no responder»); no se solicitan ingresos en dinero ni documentación económica.
- Introducción actualizada a estrato 2 o superior.
- API valida por separado ambos estratos y acepta tipo de ingresos vacío.
- Base `RESP_ESTUDIO_OPINION_2026`: nuevas columnas Z «Estrato declarado de vivienda» y AA «Tipo de ingresos (opcional)». Se mantienen A:W; X queda libre; Y1:Y2 se preserva para `PUBLIC_ENABLED`. Se amplía la cuadrícula a 27 columnas al inicializar, si hace falta.
- Se mantienen las inscripciones anteriores; los campos nuevos de filas previas permanecen vacíos, sin inventar datos.

**Pruebas:** se validó sintaxis JS de frontend y backend. Pendiente comprobar despliegue Vercel READY, ingreso de ejemplo y persistencia de ambos campos en las columnas Z y AA.

**Dominio:** se recomendó contratar un dominio neutral independiente y añadirlo en Vercel (Settings > Domains); el dominio por sí solo apuntaría a la raíz del dashboard actual. Para usar la raíz del dominio como landing page de la encuesta, realizar un despliegue/proyecto aislado que sirva el formulario como página inicial y conserve la API y el almacenamiento corporativos, con transparencia del responsable legal en consentimiento. Ningún dominio fue comprado ni configurado.

## FO-CHG-143 — Título y dominio neutral (19/11/2026)
- Título de campaña actualizado a **«Estudio de opinión · Tu voz, tu hogar»**, con encabezado visible «Tu voz, tu hogar», metadatos HTML y encabezado para compartir.
- Se conserva la identidad cromática neutral y el formulario de FIBRAZO original intacto.
- Consulta de dominios mediante Vercel (solo lectura): estudioopinion.co, estudiodeopinion.co, tuvoztuhogar.co y tuvozytuhogar.co disponibles al momento de consulta; compra inicial USD 29,99 y renovación USD 24,80 según respuesta del registrador, sujetos a modificación. estudioopinion.com.co no disponible.
- Recomendación: **estudioopinion.co**. Sin compra ni cambios de DNS/propiedad del dominio; debe aprobarse el gasto y registrar el dominio antes de asignarlo. Separar la landing de la raíz del dashboard requiere configurar un despliegue/proyecto neutral o routing por host para que el dominio apunte directamente a la encuesta.

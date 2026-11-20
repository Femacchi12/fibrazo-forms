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

## FO-CHG-144 — Cabecera restaurada y portal público neutral gratuito (19/11/2026)

**Título visual aprobado**
- Marca superior: ESTUDIO DE OPINIÓN · CARTAGENA 2026.
- Etiqueta: TU EXPERIENCIA IMPORTA.
- Título principal: «Tu hogar, tu voz.»
- Se mantienen colores neutrales lavanda/gris, sin logos comerciales en el encabezado.
- Metadatos HTML/Open Graph y Web Share actualizados a «Estudio de opinión · Tu hogar, tu voz».
- No se modifica `/focus-group` ni sus datos.

**Arquitectura para encuestas neutrales reutilizables**
- Vercel: proyecto separado `estudios-de-opinion` con ID `prj_uQhe8G5LterXxvxjyctfiLSYvvIu` en la cuenta personal de Vercel aprobada para el proyecto.
- URL gratuita, sin pago de registro: `https://estudios-de-opinion.vercel.app/`. Dominio `verified: true`, despliegue `READY` ID `dpl_DSDhbzCG7ozJZ5hTA5rRA27gt6HC`.
- Fuente GitHub: `Femacchi12/fibrazo-forms`, carpeta `neutral-site/`, configurada como raíz del nuevo proyecto Vercel. Despliega cambios desde `main`.
- `neutral-site/index.html`: copia pública de la versión neutral que sirve en raíz. `neutral-site/estudio-opinion-icon.svg`: ícono neutral.
- `neutral-site/vercel.json`: proxy de `/api/estudio-opinion` hacia `https://fibrazo-forms.vercel.app/api/estudio-opinion`. La solicitud del navegador permanece same-origin frente al proyecto público, mientras que la validación y persistencia siguen en el backend corporativo. No se duplicaron secretos, roles ni credenciales Firebase.
- Protección Vercel SSO deshabilitada **solo en este proyecto público**; la administración y base corporativa originales permanecen con sus controles.
- El dominio neutral `*.vercel.app` es gratuito en la configuración vigente del plan. Un dominio propio `.co` **no** es gratuito y exigiría registro/pago.
- Futuras encuestas: incorporar nuevas rutas estáticas en `neutral-site/`, publicar mediante GitHub/Vercel y añadir, si requieren guardado, reglas backend/API y consentimiento correspondientes. Mantener control de publicación por encuesta y fuentes corporativas.
- No se compraron dominios ni se configuraron DNS externos.

**Verificación**
- Vercel confirmó `READY` para el despliegue del proyecto neutral y el dominio `verified: true`.
- Pendiente QA real de carga en navegador externo, `GET /api/estudio-opinion?config=1` a través del proxy y envío/post a la base. El verificador web no pudo conectarse a la URL desde este entorno; eso no demuestra una caída del sitio.
- Al modificar `estudio-opinion.html` del proyecto original en el futuro, sincronizar los cambios relevantes en `neutral-site/index.html`, o introducir build compartido para evitar divergencias.

## FO-CHG-145 — URL neutral única en dashboard (19/11/2026)
- En la tarjeta «Estudio de opinión · Convocatoria neutral» del dashboard FIBRAZO Forms, acciones **Abrir**, **Ver detalles → enlace público** y **Copiar** usan únicamente `https://estudios-de-opinion.vercel.app/`.
- En «Administrar → Estudio de opinión», el enlace y botón **Copiar** muestran exactamente la misma URL neutral. El control activar/desactivar continúa usando la API corporativa y conserva permisos.
- La ruta heredada `/estudio-opinion` en `fibrazo-forms.vercel.app` se conserva operativamente como compatibilidad, pero no debe difundirse ni aparecer como enlace público del dashboard; sigue existiendo la API `/api/estudio-opinion` necesaria para el nuevo sitio neutral.
- Se actualizan versiones de scripts en `index.html` y caché PWA para evitar enlaces anteriores retenidos en el navegador.
- QA: validar que el botón «Abrir», el enlace «Ver detalles», «Copiar» y el campo de Administrar coincidan, así como el despliegue Vercel READY; sin alterar el Focus Group original.

## FO-CHG-146 — Sede y agenda definitiva de convocatoria (19/11/2026)
- Formulario neutral `/estudio-opinion` y página pública `neutral-site/index.html` sincronizados.
- **Institución Educativa Las Gaviotas, Sede Niño Jesús**, Cartagena; coordenadas especificadas por usuario: `10.40173, -75.49147`. Enlace directo a Google Maps por coordenadas, sin inventar dirección postal.
- **Única fecha** disponible: sábado **28 de noviembre de 2026**.
- Horarios de inicio disponibles: **09:00, 14:00 y 17:00**, hora local de Cartagena; cada sesión de 90 minutos, sujeto a confirmación telefónica de participación.
- El formulario mantiene fecha fija `disponibilidad="Sábado 28"` y pregunta obligatoria `horaSesion` con los tres horarios.
- Backend `api/_estudio-opinion.js` valida ambas dimensiones; rechaza domingo 29, alternativas antiguas y horas diferentes. No afecta el Focus Group original.
- Fuente corporativa `RESP_ESTUDIO_OPINION_2026`: conserva columna O «Disponibilidad» con fecha, columna **AB** «Horario sesión 28-11-2026» con hora. Expande las columnas de la hoja hasta AB (28) si es necesario, conservando Y2 «PUBLIC_ENABLED»; Z y AA siguen como estrato vivienda y tipo de ingresos.
- Link canónico público: `https://estudios-de-opinion.vercel.app/`. La ruta heredada corporativa permanece para compatibilidad técnica, no se presenta como URL del dashboard ni se considera una base de datos adicional.
- Estado QA al iniciar: hoja tenía encabezados A:AA, ninguna inscripción visible; por lo tanto **no existía evidencia de un envío real exitoso** desde el dominio neutral. Confirmar estructura AB y realizar una prueba E2E separadamente sin introducir candidatos falsos en la convocatoria.

## FO-CHG-147 — Retiro de URL duplicada (19/11/2026)
- Eliminado físicamente del repositorio el antiguo `estudio-opinion.html` ubicado en la raíz de FIBRAZO Forms.
- Agregado redirect permanente en `vercel.json` desde `https://fibrazo-forms.vercel.app/estudio-opinion` a `https://estudios-de-opinion.vercel.app/`, para evitar duplicar formularios y preservar enlaces compartidos anteriormente.
- La API corporativa `/api/estudio-opinion` permanece activa porque **es la única fuente de persistencia** para la encuesta del nuevo proyecto neutral. No se eliminó la pestaña `RESP_ESTUDIO_OPINION_2026` ni ningún registro.
- El sitio canónico se mantiene exclusivamente en `neutral-site/index.html` y el proyecto `estudios-de-opinion`.
- Este bloque reemplaza como estado vigente las notas previas que proponían conservar el HTML heredado por compatibilidad.

## FO-CHG-148 — Ajustes de preinscripción (20/11/2026)

**Único formulario intervenido:** `neutral-site/index.html` y API corporativa `api/_estudio-opinion.js`. No modificar `/focus-group`.

- Bloque «Lugar de encuentro»: cuatro líneas visibles (título, Institución Educativa Las Gaviotas, Sede Niño Jesús, Barrio Las Gaviotas), con botón de Google Maps a la derecha en escritorio y debajo en móviles. El enlace sigue usando las coordenadas exactas 10.40173, -75.49147, sin exponerlas en el texto del bloque.
- Perfil admisible: **30 a 55 años inclusive**, validado por formulario y servidor.
- Indicaciones del teléfono: solo los 10 dígitos colombianos, sin mencionar prefijo internacional +57 en etiquetas o mensajes. Backend conserva normalización de +57 para compatibilidad.
- Etiqueta de barrio: «¿En qué barrio vivís?».
- Tipo de ingresos: selector **obligatorio** con opción inicial «Seleccioná una opción» y respuestas Fijos / Variables / Mixtos / Prefiero no responder. Elegir «Prefiero no responder» cumple la obligación de responder sin revelar información financiera.
- Horario de sábado 28/11: selección múltiple (09:00, 14:00, 17:00) y alternativa excluyente «Puedo en cualquiera de los horarios». Envío como array; servidor valida exclusivamente valores conocidos y normaliza a una única celda `AB` separada por coma o «Cualquiera».
- Consentimiento de datos: se quita el hipervínculo a la política corporativa y la frase específica de permiso GPS solicitada; se conserva la identificación de FIBRAZO S.A.S. como responsable del tratamiento. **Revisar cumplimiento de transparencia para ubicación y datos personales antes de difusión masiva**.
- En el chequeo del 20/11, la hoja `RESP_ESTUDIO_OPINION_2026` tenía encabezados A:AB pero ninguna respuesta con ID. La inscripción reportada por el usuario **no fue corroborada** en la base corporativa. Se requiere prueba de envío de extremo a extremo y revisar fallas por mensaje de interfaz/servidor si persiste.

## QA del 20/11/2026 — resultado real
- Vercel confirma READY en ambos proyectos (neutral `dpl_AQTpMUuSZLUUaT9oSJHmMPeEh6Rp` y corporativo `dpl_FUMVjETtLgB9sJtUzCNk4ALbeczt`), commit de código `92f89518`.
- Navegador de prueba abrió `https://estudios-de-opinion.vercel.app/` y completó con datos sintéticos los 4 pasos hasta la acción «Enviar preinscripción». Comprobó edad, estratos, elección «Prefiero no responder» y dos horarios simultáneos (09:00 y 14:00).
- El ensayo de navegador se agotó antes de pulsar Enviar. **No hubo solicitud de inscripción ni ID de referencia, por lo que no se afirma éxito E2E.**
- Consulta a `RESP_ESTUDIO_OPINION_2026!A1:AB18`: encabezados presentes y **0 inscripciones con ID**, incluida la prueba declarada por usuario. Verificación posterior del primer POST real obligatoria.
- No se insertaron registros de QA en la hoja corporativa, evitando datos falsos entre los posibles candidatos.

## FO-CHG-149 — Resumen protegido y cierres manuales (20/11/2026)
- Denominación interna: **Focus Group · Estratos 2 y 3+**. El público sigue viendo «Estudio de opinión · Tu hogar, tu voz».
- Tarjeta del dashboard FIBRAZO Forms: acceso «Resumen de inscriptos» desplegando detalles. Enlace compartible `https://fibrazo-forms.vercel.app/?resumen=focus-group`, con autenticación Firebase y autorización de servidor.
- **Permisos:** usuarios autenticados con correo verificado `@fibrazo.com` y administradores base pueden consultar; solo administrador base puede modificar estado, sesión asignada, aplicar sugerencias y cerrar/reabrir manualmente horarios. No se presentan contactos en el sitio neutral.
- Backend `api/_opinion-admin.js` integrado a la función existente `/api/estudio-opinion?summary=1`: GET lectura (datos, cupos, propuestas); POST acción `update`, `applySuggestions` y `setSlot`, restringidas. No se creó función serverless adicional.
- Campaña actual `ESTUDIO_OPINION_2026`: filtros por encuesta, fecha del evento, día, horario, estado y búsqueda por nombre/celular. Estructura preparada para campañas futuras, aunque solo la campaña actual tiene fuente implementada.
- **Estados:** Preinscrito; Contactado a confirmar; Confirmado; No asistirá. Se conserva el estado de cada inscripción en la columna R, y se registra la sesión única asignada en AC, fecha de cambio en AD, usuario gestor en AE, campaña en AF y sesiones declaradas en AG.
- **Datos y configuración:** nueva hoja `CONFIG_ESTUDIO_OPINION_2026` para cuatro horarios y su estado abierto/cerrado; por defecto todos abiertos. Fuente canónica de inscriptos: `RESP_ESTUDIO_OPINION_2026`. El frontend público carga únicamente las combinaciones manualmente abiertas, con mensaje de disponibilidad y opción de seleccionar varias sesiones. El servidor comprueba la lista de sesiones activas en cada POST y rechaza selecciones cerradas.
- **Cierre:** exclusivamente manual por el administrador. Alcanzar 12, 13, 14 o 15 candidatos NO bloquea automáticamente el horario. Cerrar sáb 9:00 no cierra sáb 14:00; cerrar ambos elimina el sábado de la encuesta; cerrar las cuatro sesiones deja la convocatoria sin opciones.
- **Indicadores de interesados** (disponibilidad, no personas asignadas): 0–2 blanco; 3–7 verde; 8–11 amarillo; 12 naranja; 13–14 rojo; 15 o más rojo intenso. Cada tarjeta muestra disponibles, asignados, confirmados, contactados, preinscritos asignados y no asistirán. Ayuda flotante en indicadores y estados.
- **Sugerencia de distribución:** mantiene fijos a los confirmados, prioriza a personas con menos alternativas, distribuye las demás entre sesiones de capacidad objetivo 12 y sugiere reubicaciones de personas no confirmadas; necesita revisión y confirmación explícita antes de aplicar. Cada participante conserva sus preferencias originales en AG. Pueden existir más de 12 interesados por horario.
- **Acceso moderadores:** enlace a resumen corporativo bajo Firebase. Lectura solo de personas con dominio habilitado; operaciones de gestión limitadas a admin base. Evitar enlaces públicos directos a la hoja con PII.
- **Compatibilidad:** filas antiguas sin AG se interpretan según fecha/días O y horarios AB. No se borran ni se duplican datos anteriores.
- **QA requerido:** verificar HTTP/configuración por dominio neutral, comprobación no autenticada 401 para resumen, autenticación con usuario corporativo, filtros, cambios de estado, cierres manuales, sugerencias y envío real de formulario hasta Sheets; documentar cualquier fallo antes de considerarlo terminado.

## FO-CHG-149-B — Corrección de persistencia y rescate de inscripción (20/11/2026)
- Hallazgo: Google Sheets `values.append` con `A:AG`, combinando encabezados no contiguos con un indicador de publicación en Y2, permitió insertar la primera respuesta a partir de Z2 en lugar de A2. Esta desviación explicaba por qué no figuraba en los resultados de lectura.
- Se identificó el registro de prueba con referencia `EO-MWP1WN4T-SCX7T` desplazado 25 columnas. Se migró a la fila 3, columnas A:AG, conservando su identificador, fecha y valores; se eliminó la copia desplazada Z2:BA2. La fila 2 no se usará para registros de inscripción.
- Se cambió el guardado en `api/_estudio-opinion.js` a `spreadsheets.batchUpdate.appendCells`: escritura atómica de una fila desde columna A, sin depender de la detección automática de la tabla. Commit `733392ab`.
- Se confirmó por lectura corporativa que la fila 3 tiene el ID original en B, la campaña en AF y la sesión seleccionada en AG; la columna Z2 ya no contiene la fecha de respuesta desplazada.
- Pendiente: prueba de una inscripción posterior al nuevo despliegue para verificar la escritura en A:AG y lectura desde la vista de resumen con autenticación.

## QA de inscripción completa — 20/11/2026
- Despliegue de corrección de persistencia `733392ab` en Vercel `READY`, alias corporativo `fibrazo-forms.vercel.app`.
- Se realizó una inscripción sintética por navegador externo desde `https://estudios-de-opinion.vercel.app/`, con dos sesiones seleccionadas, sin GPS. El navegador recibió respuesta de éxito e identificador `EO-MWPFYGFE-QT6HS`.
- Lectura de Sheets confirmó que el registro se guardó en **A4:AG4** con ID en B4, fechas en O4/AB4 y sesiones precisas en AG4. No quedó desplazado a otras columnas.
- Una vez comprobado el resultado, se eliminó **exclusivamente el registro sintético de QA**, identificado por nombre/apellido de prueba e ID; se verificó que solo persistiera la preinscripción original `EO-MWP1WN4T-SCX7T` en la fila 3. No se borraron registros reales ni se alteró el control de publicación.
- API `GET /api/estudio-opinion?config=1`: respondió las cuatro sesiones activas desde el dominio público y el corporativo.
- API privada `GET /api/estudio-opinion?summary=1` sin token: HTTP 401, comportamiento esperado.
- **Pendiente:** prueba interactiva autenticada de edición de estado, sugerencias y cierre/reapertura desde el dashboard. No se asume superada por existir código y endpoints.
- Regla adicional `6a19cf52`: el POST compara teléfonos normalizados con la base para impedir duplicar preinscripciones de una misma persona (HTTP 409). La vista de resumen considera únicos los registros asociados a un ID de inscripción.

## FO-CHG-150 — Pulido visual y navegación del resumen de Focus Groups (20/11/2026)
- Tarjeta neutral en el listado principal de formularios: nombre público interno abreviado a **Focus Group**. No se modifica el título genérico de la convocatoria pública ni se fusionan fuentes de datos.
- El botón «Resumen de inscriptos» ahora abre **nueva pestaña** `/?resumen=focus-group` sin reemplazar el dashboard original; el acceso conserva autenticación Firebase y permisos del backend.
- Título interno del resumen **Focus Groups** (plural), independiente de la denominación específica de la campaña.
- Filtro **Encuesta** con opción «Todas las encuestas» y etiqueta **Focus Group** para la campaña actual. Las opciones se generan de las campañas autorizadas que devuelva la API; no se inventan campañas ni se mezclan respuestas de fuentes futuras hasta integrar sus APIs.
- Botón superior simplificado: **Copiar enlace**.
- Diseño consistente con tokens de `styles.css` corporativo: fondo negro, paneles verde oscuro, verde FIBRAZO `#00f29a`, bordes neutros; mantienen la gradación funcional por afluencia (blanco, verde, amarillo, naranja, rojo, rojo intenso).
- Signos de ayuda convertidos de botones con contornos a **signos ? discretos** (sin caja ni globo permanente), con explicación breve flotante mediante hover y foco de teclado.
- Compactadas tarjetas, tabla, dropdowns de asignación/estado y botones Ver inscriptos, Cerrar/Reabrir y Guardar. Preservadas funciones, restricciones y validación de servidor.
- Actualizados los scripts en `index.html` y versión de caché del service worker para forzar la recarga de estilos.
- QA: verificar despliegue READY y, con cuenta corporativa autenticada, apertura en pestaña nueva, filtros, visualización responsive y ayuda flotante. Sin cambios en filas de participantes ni cierres de sesiones.

## FO-CHG-151 — Legibilidad de indicadores, colores de controles y ayuda (20/11/2026)
- Vista protegida `focus-resumen.js`: los indicadores por sesión «Asignados», «Confirmados», «Contactados a confirmar», «Preinscritos asignados» y «No asistirán» muestran ahora su cantidad **inmediatamente junto al título**, sin justificarla al extremo derecho; cifras tabulares en chips compactos.
- Colores semánticos y consistentes con tokens de FIBRAZO: filtros de encuesta/búsqueda verdes, fecha/día verde agua, horario azul verdoso y estado ámbar; todos con texto claro de contraste. Selectores de sesión asignada verdes y de estado con indicación visual según Preinscrito (verde neutro), Contactado a confirmar (ámbar), Confirmado (verde intenso), No asistirá (rojo), actualizada al cambiar la opción.
- Botones compactos con color de función: Ver inscriptos verde, Cerrar ámbar, Reabrir verde, Guardar verde. Se conserva el gradiente de cantidad de interesados 0–2 blanco, 3–7 verde, 8–11 amarillo, 12 naranja, 13–14 rojo, 15+ rojo intenso.
- El botón «Sugerir distribución» suma un signo de ayuda flotante, que describe que propone asignaciones sin aplicarlas hasta la confirmación expresa.
- Solo cambios de UI y PWA cache-busting: sin modificar inscripciones, datos, estados, permisos, asignaciones, servidores ni apertura/cierre de sesiones.

## FO-CHG-152 — Control cruzado de duplicados y recordatorio de asistencia (20/11/2026)
- En `neutral-site/index.html`, primer paso del formulario, se agrega **Número de cédula** obligatorio (6 a 10 dígitos, solo números), con explicación de su uso para detectar inscripciones repetidas. La persona sigue informando teléfono y confirmación.
- En `api/_estudio-opinion.js`, validación en servidor y **rechazo HTTP 409** si el **mismo celular** ya consta en `RESP_ESTUDIO_OPINION_2026` o `RESP_FOCUS_GROUP_2026`; o si el **mismo número de cédula** ya consta en una inscripción previa de `RESP_ESTUDIO_OPINION_2026`. Respuesta pública genérica: «Estos datos ya fueron cargados en una inscripción anterior. No es necesario volver a registrarse.»; no se divulga la causa concreta ni datos de otro candidato.
- Comprobación recíproca en el endpoint del Focus Group corporativo: evita que el mismo teléfono vuelva a inscribirse allí o en el estudio neutral. No altera las preguntas ni reglas de perfil del Focus Group original.
- Identificador de cédula almacenado como **texto** en la columna **AH** de la pestaña `RESP_ESTUDIO_OPINION_2026`, con encabezado «Número de cédula». `api/_opinion-admin.js` asegura la extensión de la hoja a 34 columnas. La cédula **no se envía en la respuesta JSON ni se muestra en el dashboard de moderadores**; se mantiene en la fuente corporativa restringida.
- **Límite de información histórica:** el formulario original `RESP_FOCUS_GROUP_2026` no solicitaba cédula, por lo que solo se puede verificar coincidencia de teléfono sobre sus registros previos. No se intentó inferir o reconstruir documentos inexistentes. La comprobación se limita a las **dos bases de convocatorias** pertinentes, no a relevamientos o registros operativos sin consentimiento específico para esta finalidad.
- Pantalla de éxito: «¡Gracias por inscribirte!»; recuerda actividad **sábado 28 y domingo 29 de noviembre de 2026** y, **si su participación queda confirmada**, la obligación de presentarse el día y horario asignados con documento de identificación y una factura de servicio público.
- No se modifican los estados, las asignaciones, el cierre manual de las cuatro sesiones ni la distribución de participantes ya registrados.
- QA: validar extensión/encabezado AH, rechazo 409 por teléfono de ambos formularios, coincidencia por documento de nueva encuesta y un envío exitoso no duplicado; verificar que no se filtren valores personales en errores. La comprobación solo por lectura del código o despliegue READY no sustituye las pruebas POST.

## FO-CHG-153 — Validación de duplicados antes de continuar (20/11/2026)
- En el formulario público neutral, el paso 1 comprueba en el servidor el par **cédula + celular** contra la fuente de verdad **RESP_ESTUDIO_OPINION_2026**; además busca el celular en **RESP_FOCUS_GROUP_2026**. La cédula solo puede verificarse donde haya sido previamente recopilada.
- Endpoint `POST /api/estudio-opinion?check=1`: requiere ambos valores sintácticamente válidos; únicamente devuelve booleanos `cedulaRegistrada` y `telefonoRegistrado`, sin identidades ni valores almacenados. Accesos limitados a 12 consultas por IP en 10 minutos mediante `SECURITY_LOG`, con errores genéricos en fallos operativos.
- La comprobación se inicia cuando se completaron ambos campos y se sale de cédula o confirmación de celular, y se exige **siempre** al presionar «Continuar» desde el paso 1. Ante fallo de red/servidor, **no avanza**.
- Mensaje de cédula duplicada: «Este número de cédula ya se encuentra registrado. No es necesario volver a inscribirte.»
- Mensaje de celular duplicado: «Este número de celular ya se encuentra registrado. Si necesitás actualizar tu contacto, comunicate con el equipo organizador.» Se señalan los campos correspondientes y no se permite pasar al paso 2.
- Se mantiene una segunda comprobación completa en el POST final para evitar guardar duplicados ante carreras de registro; con mensajes separados y HTTP 409.
- Para seguridad se reutilizan las bases de convocatorias autorizadas, sin difundir información de otros registros. Registros de prueba **no eliminados** por indicación del usuario; la limpieza se realizará al terminar el desarrollo.
- Pruebas de aceptación: primer paso no permite continuar con cédula duplicada ni celular duplicado; permite continuar con ambos nuevos; servidor no devuelve PII en verificación; POST final sigue rechazando duplicados; errores de red detienen el avance.

### QA y corrección final FO-CHG-153 (20/11/2026)
- Prueba automatizada inicial descubrió un doble escape del patrón de celular (`\\d` literal), que generaba el error «Revisá la cédula y el número de celular antes de continuar» incluso con números válidos. Se corrigió en **formulario neutral y servidor** (commits `f0bdb03c` y `1e8f36f8`) y se verificó la sintaxis.
- Despliegues Vercel **READY** del mismo código `1e8f36f8` en ambas aplicaciones: FIBRAZO Forms corporativo y dominio neutral.
- Prueba aislada del endpoint con respuestas de Google Sheets simuladas, sin exponer ni alterar datos reales: 4/4 casos correctos: teléfono duplicado en estudio neutral, cédula duplicada en estudio neutral, teléfono duplicado en Focus Group anterior, y combinación de ambos identificadores sin registro.
- La simulación no sustituye un POST final real con cédula y teléfono repetidos. La segunda prueba visual con el número registrado estuvo restringida por el entorno de navegación; no se falsea un resultado exitoso. El formulario sigue **bloqueando el avance** cuando el servidor no completa la consulta.
- Registros de prueba conservados según decisión del usuario; no se eliminan hasta cierre de desarrollo.

## FO-CHG-154 — Contacto WhatsApp en mensajes de duplicado (20/11/2026)
- Para intentos de avanzar con **cédula o celular registrado**, el paso 1 mantiene el bloqueo, mostrando la indicación «Si necesitás actualizar tus datos, escribinos por WhatsApp al **312 460 2853**».
- El número es un enlace interactivo a `https://wa.me/573124602853`, que abre una conversación con el equipo organizador en una pestaña nueva, sin enviar mensajes automáticamente.
- Si el servidor detecta el duplicado recién al enviar, la pantalla de error incorpora el mismo acceso por WhatsApp.
- Mensajes de error del backend ajustados para recomendar contacto por WhatsApp; no devuelven documentos ni teléfonos de participantes.
- No se modifican los registros de prueba, controles de cierre, criterios de participación ni asignaciones.


## FO-CHG-155 — Contacto WhatsApp visible para cédula duplicada (20/11/2026)
- Se refuerza la alerta de **número de identificación registrado**: el mensaje en el campo de cédula indica expresamente que **no es posible continuar** y remite al WhatsApp de asistencia **312 460 2853** (https://wa.me/573124602853). El número es clicable.
- El resumen de errores del primer paso ahora incluye también el enlace clicable cuando la cédula ya existe; se conserva el enlace en el campo. Se muestra el mismo acceso desde el resumen cuando el teléfono está duplicado para mantener la experiencia consistente.
- El backend devuelve un mensaje claro de bloqueo en el caso de cédula duplicada, con indicación de contactar al equipo organizador. Si la coincidencia se detecta durante el envío final, la interfaz mantiene el enlace WhatsApp del error de inscripción.
- Sin cambios en las reglas de cotejo de cédulas/celulares, protección de datos, bloqueo de avance, administración ni registros almacenados; no se borran registros de prueba.
- QA requerido: verificar en el navegador, contra un registro de prueba autorizado, que la cédula duplicada presenta el mensaje y enlace tanto junto al campo como en el aviso general, y que no permite pasar al paso 2. Repetir para teléfono y comprobar rechazo HTTP 409 al envío.

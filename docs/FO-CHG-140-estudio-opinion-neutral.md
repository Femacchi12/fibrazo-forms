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

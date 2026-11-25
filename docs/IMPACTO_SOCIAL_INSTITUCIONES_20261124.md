# Impacto Social · inscripción de instituciones educativas públicas

**Cambio:** FO-CHG-142 · 24/11/2026 · implementación inicial.
**Fuente exacta:** JSON `FIBRAZO_Socializacion_Formulario_20261124_181503.json`, Google Form Socialización FIBRAZO, ID `1lRiulE4q3tIepmwmfzmnqWOobkOLwFktEgwChNxo4cA`.
**Formulario nuevo:** `IMPACTO_SOCIAL`; título **Impacto Social**; slug `impacto-social`.
**Alcance autorizado:** solo instituciones educativas públicas. Excluidos explícitamente «otras instituciones», J.A.C. y cualquier importación histórica.

## Arquitectura
- Configuración renderizada: `forms-config.js`.
- Esquema y orden de columnas/servidor: `impacto-social-schema.json` y `api/_impacto-social.js`.
- Backend: `api/_core.js` → `validateSubmission`, `api/submissions.js` → `buildRow`, fotos con `fieldKey`, lectura de `RESP_IMPACTO_SOCIAL`.
- Base corporativa: `FIBRAZO Forms - Base de datos`, pestañas `FORMULARIOS` y nueva `RESP_IMPACTO_SOCIAL` (66 columnas, separado de Socialización y Exploración). No se escribe sobre `Base_Esc-Fund.` ni se alimenta automáticamente el Dashboard de Impacto Social.
- Identidad visual: `impacto-social-icon.svg` es copia exacta del favicon vigente en `Femacchi12/dash-impacto-social-fibrazo`.
- Draw.io y `docs/flow-sync-manifest.json` deben estar sincronizados con el formulario.

## Reglas
- 8 etapas: ubicación, institución, contactos, caracterización, infraestructura, internet anterior condicional, fotografías, mensaje informativo.
- El bloque «Servicio de internet existente» se muestra únicamente al responder **SI** a «Actualmente cuentan con algún servicio de internet».
- Celulares de rector y coordinador: expresión `^3[0-9]{9}$`; exactamente 10 dígitos, sin `+57`, espacios ni otros caracteres.
- Todos los correos del flujo: patrón básico de formato de email; opcionales se validan si están informados.
- 6 campos de fotografías con identidad por `fieldKey`, primera fachada requerida; demás opcionales, límites del backend vigente.
- Opciones «Otro»: campo adicional obligatorio si se selecciona, sin modificar las opciones originales.
- Registros QA se identifican como prueba y no deben aparecer como resultado operativo. No se realizaron envíos reales.
- Permisos: formulario privado; administrador de la aplicación puede inspeccionarlo. No se habilita acceso público ni dominio de socializadores hasta revisión.

## Diferencias o pendientes frente a Google Forms
- El JSON exportado no incluye el contenido de la imagen de ejemplo de placa: en el formulario se deja una referencia textual hasta que exista la imagen aprobada.
- No se recuperaron reglas específicas internas de validación de Google Forms; se copiaron campos, ayudas, opciones, obligatoriedad recuperada y el salto de internet anterior. Se añadieron las dos validaciones solicitadas.
- El mensaje original indica identificación por DANE para soporte, mientras el proceso futuro discute NIT. Se conserva provisionalmente el contenido del origen, sin reinterpretarlo.
- No se migran respuestas históricas ni se generan tickets/servicios en Sysbrazo; la incorporación automática a `Base_Esc-Fund.` requiere aprobación y modelo de conciliación por sede.

## QA
Pruebas técnicas de esquema: 63 campos declarados, 8 secciones, 6 fotos, 4 emails, 2 teléfonos. Sintaxis de archivos JS válida; concordancia entre esquema de servidor y UI; aceptación de celular `3001234567`, rechazo de `573001234567`, `300123456`, `4001234567`; rechazo de correos inválidos; prueba de foto principal obligatoria; encabezados y filas de 66 columnas.
**Pendientes antes de abrir el acceso al equipo:** prueba de navegador autenticado móvil/escritorio, envío QA controlado y verificación de fotos en Drive, reintentos offline, destino de respuesta, no duplicidad, permisos y despliegue Vercel READY.

## FO-CHG-170 · Acceso administrativo y modo test (24/11/2026)

- Acceso explícito confirmado en `PERMISOS_FORMULARIO` para `eduardo@fibrazo.com` / `IMPACTO_SOCIAL` con los cuatro permisos de lectura/edición/administración/base activados. El acceso se mantiene `PRIVADO` y el formulario `Activo`; no se habilita el dominio completo.
- `Modo test` es un selector visible **únicamente** para `eduardo@fibrazo.com` con sesión autenticada, dentro del mismo formulario Impacto Social (no hay formulario paralelo).
- Por defecto el selector está apagado, el formulario exige todos los campos, y el envío queda como operativo.
- Al activar el modo test permite navegar por los pasos hacia adelante o atrás y por la barra de etapas sin diligenciar obligatorios. En esta modalidad se muestran también las secciones condicionales para revisión rápida.
- En la pantalla de revisión se identifica **PRUEBA QA** y el backend autoriza el indicador únicamente si el email verificado es `eduardo@fibrazo.com`. La aplicación nunca permite a otro usuario activar pruebas mediante un parámetro del cliente.
- Los envíos de prueba se guardan en la misma pestaña `RESP_IMPACTO_SOCIAL` con columna D `Prueba QA` = `Sí`; se excluyen de los resultados y métricas operativas, y no sincronizan ninguna base maestra de instituciones educativas. No se eliminan automáticamente: quedan trazables para revisar y pueden limpiarse separadamente más adelante.
- Para las pruebas se permiten campos y fotografías incompletos; cualquier teléfono, email u opción que sí se complete sigue pasando las validaciones habituales, tanto en cliente como en servidor. En modo normal se preservan todos los obligatorios.
- El control para otros formularios se mantiene sin cambios; allí continúa el mecanismo de clasificación QA preexistente.
- Tras cambios en la matriz, refrescar la sesión permite volver a consultar los permisos desde `/api/access`; si el navegador conserva un permiso antiguo, forzar recarga de la página.
- Verificaciones ejecutadas: sintaxis JS de UI y API, aceptación de prueba vacía, rechazo de teléfonos y emails mal formados, bloqueo de envío real incompleto, marcador de QA y longitud de 66 columnas. **Pendiente:** prueba navegador real con la cuenta corporativa, verificación de permiso en sesión, despliegue Vercel READY y un envío real controlado para confirmar persistencia y exclusión de métricas.

## FO-CHG-172 · Corrección de base operativa y administración (25/11/2026)

**Causa raíz confirmada:** la variable `GOOGLE_SHEET_ID` de producción de Vercel apunta a `1E66QjQVPT61j-2MdyL3V6s9iXKaX15wBKOujga8p4SY` (`FIBRAZO Forms - Base de datos operativa`), mientras la alta inicial de Impacto Social y sus permisos se habían escrito en una copia independiente `1eBp7jwvRbY76z0Sfo-fi45PgyP91aGM4wn7L0w_Za7g`. Esta última **no es la fuente de verdad de producción**. El servidor solo veía 4 registros en `FORMULARIOS`, de ahí «Sin acceso» y ausencia de Impacto Social en Administrar.

**Corrección realizada en la fuente de verdad operativa**, manteniendo el mismo `GOOGLE_SHEET_ID` de producción:
- Alta de `IMPACTO_SOCIAL` en `FORMULARIOS` fila 6; estado Activo, acceso Privado, sin autorización de dominio ni pública; máximo 6 fotos; pestaña `RESP_IMPACTO_SOCIAL`.
- Alta de permiso explícito de administrador `eduardo@fibrazo.com` en `PERMISOS_FORMULARIO`, con cuatro permisos `TRUE`. El usuario ya figura `ADMIN / ACTIVO` en `USUARIOS`.
- Creación de `RESP_IMPACTO_SOCIAL` en la base de producción con 66 columnas idénticas al esquema de la aplicación; datos iniciales vacíos. Los registros y pestañas anteriores no se editaron.
- `api/admin.js` y `admin-v03.js`: los máximos de fotos reflejan el contrato actual: `CHURN / EXPLORACION / EXPLORACION_PRESENCIAL` 3, `INTELIGENCIA_OPERADOR` 5, `IMPACTO_SOCIAL` 6. Evita que guardar desde Administrar reduzca de forma involuntaria las fotos a 3.
- Versión de `admin-v03.js` y caché de la PWA actualizadas. Se mantiene el control del servidor; no se añadieron reglas de acceso general ni se alteró la documentación de otros formularios.
- Los dos formularios públicos de Focus Group tienen controles especializados separados de la matriz `FORMULARIOS`; no forman parte de esta alta de permisos.

**Verificado en Google Sheets:** cinco IDs `CHURN`, `EXPLORACION`, `EXPLORACION_PRESENCIAL`, `INTELIGENCIA_OPERADOR`, `IMPACTO_SOCIAL`; hoja de 66 encabezados sin respuestas; permisos corporativos 4/4.
**Pendiente:** verificar despliegue Vercel READY, confirmación de lista completa en sesión autenticada y navegación del modo test, un envío QA y comprobación de exclusión de métricas. No dar por finalizado ese QA por la sola modificación de Sheets.

## FO-CHG-173 · Diferenciación visual, ubicación y cobertura de troncales (25/11/2026)

**Alcance:** solo `IMPACTO_SOCIAL`, con el mismo esquema y base de respuestas operativa. No se alteran Google Forms original, otras encuestas, ni registros históricos.

- Cada pregunta tiene una superficie ligeramente distinta y un borde muy discreto, con variación alternada de tonos oscuros inspirada en la separación del Google Form. No hay márgenes externos nuevos ni segundo recuadro alrededor del campo de respuesta: entradas y correos usan subrayado, con foco y errores claros. Se mantienen las dimensiones compactas para móvil.
- El elemento original `soc_1492169961` deja de renderizarse como texto genérico y se presenta como `coordinates-social`. El valor de respuesta sigue siendo texto de latitud, longitud en la misma columna canónica, por compatibilidad con los encabezados existentes.
- Acciones: «Tomar mi ubicación» con `navigator.geolocation.watchPosition`, precisión estimada GPS ± metros, «Mejorar precisión» buscando una nueva lectura sin reemplazar una anterior que sea mejor, y «Usar coordenada pegada» con formato y rango validado.
- Cobertura: consultar exclusivamente `GET /api/exploration?lat=…&lng=…` con token de la sesión. Esa API usa `resolveTerritorial` del Maestro Territorial de FIBRAZO, devuelve `troncalStatus`, `troncal`, `troncalNearby`, `troncalDistanceM` y `troncalSource`. `DENTRO` con nombre produce «Dentro de cobertura · Troncal X»; `FUERA` con distancia conocida y nombre produce «Fuera de cobertura · a N m de Troncal X». `SIN_CAPA` / error de servicio / sin conexión se informa como **no verificable**: nunca asignar cobertura ficticia. Esta lectura es referencial al polígono registrado, no una garantía técnica de factibilidad de instalación.
- Coordenadas manuales muestran «sin precisión GPS» para no atribuirles un error de medición inexistente. La lectura territorial está protegida frente a respuestas asíncronas obsoletas por identificación de solicitud y sesión.
- Teléfonos colombianos `^3[0-9]{9}$` y correos se verifican al abandonar el campo, con error rojo en el contenedor; el botón Continuar no supera una sección con errores en modo normal. En modo QA se omiten obligatorios vacíos pero los formatos introducidos incorrectamente impiden continuar. API conserva la validación de correo, teléfono y coordenada.
- Cambios en `ux-v04.js`, `forms-config.js`, `impacto-social-schema.json`, `api/_impacto-social.js`, `brand-alignment.css`, versiones de `index.html` y `service-worker.js`, `docs/flow-sync-manifest.json` y `docs/FIBRAZO_Forms_Flujos.drawio`.
- **Pruebas técnicas ejecutadas:** sintaxis de módulos JS, paridad de 63 campos UI/API, esquema de coordenadas en manifiesto, QA vacío válido, coordenada válida aceptada, latitud >90 rechazada, teléfono colombiano válido aceptado, `+57` e incompleto rechazados, correo inválido rechazado y registro real incompleto rechazado. Quedan pendientes prueba visual móvil, permisos de geolocalización, consulta geográfica con coordenadas de troncales conocidas y envíos de prueba desde una sesión autenticada.

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

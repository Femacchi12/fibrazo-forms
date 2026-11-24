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

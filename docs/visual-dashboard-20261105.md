# Actualización visual de dashboards · 5 de noviembre de 2026

La capa `dashboard-refresh.css` adapta el dashboard a la referencia visual solicitada: fondo negro, superficies oscuras redondeadas, tipografía Montserrat con títulos de mayor peso y controles redondeados con acciones verdes. Se conservan las dimensiones funcionales del formulario y los colores semánticos de los mapas. Se actualiza la caché del service worker para incluir la hoja.

Alcance: presentación; sin cambios en datos, permisos, sincronización ni reglas de negocio. Validación visual con sesión real y en móvil pendiente. La batería `test:forms` se detuvo por falta de la dependencia `googleapis` en el entorno local.

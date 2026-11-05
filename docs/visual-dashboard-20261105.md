# Actualización visual de dashboards · 5 de noviembre de 2026

La capa `dashboard-refresh.css` adapta el dashboard a la referencia visual solicitada: fondo negro, superficies oscuras redondeadas, tipografía Montserrat con títulos de mayor peso y controles redondeados con acciones verdes. Se conservan las dimensiones funcionales del formulario y los colores semánticos de los mapas. Se actualiza la caché del service worker para incluir la hoja.

Alcance: presentación; sin cambios en datos, permisos, sincronización ni reglas de negocio. Validación visual con sesión real y en móvil pendiente. Tras instalar las dependencias con `npm ci`, la batería completa `npm run test:forms` finalizó con éxito. El dominio de la versión previa no está autorizado por Firebase para el inicio de sesión; pendiente una alternativa de revisión sin modificar permisos de producción.

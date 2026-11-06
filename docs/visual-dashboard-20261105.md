# Actualización visual de dashboards · 5 de noviembre de 2026

La capa `dashboard-refresh.css` adapta el dashboard a la referencia visual solicitada: fondo negro, superficies oscuras redondeadas, tipografía Montserrat con títulos de mayor peso y controles redondeados con acciones verdes. Se conservan las dimensiones funcionales del formulario y los colores semánticos de los mapas. Se actualiza la caché del service worker para incluir la hoja.

Alcance: presentación; sin cambios en datos, permisos, sincronización ni reglas de negocio. Tras instalar las dependencias con `npm ci`, la batería completa `npm run test:forms` finalizó con éxito. El dominio de la primera vista previa fue autorizado en Firebase y se comprobó sesión, formulario virtual, administración, reportes y mapa de Neiva. Se amplía la capa visual a ventanas del mapa, filtros, ayudas, menús, campos y asistente. Esta ampliación requiere nueva revisión visual con sesión, incluyendo móvil y todas las pestañas, antes de publicación.

QA posterior: exploración virtual se recorrió hasta revisión sin guardar ni enviar; el menú ISP conservaba fondo verdoso y se ajustó al carbón neutro. La corrección requiere comprobarse en el nuevo despliegue. Las demás secciones y los dispositivos móviles siguen pendientes de revisión integral.

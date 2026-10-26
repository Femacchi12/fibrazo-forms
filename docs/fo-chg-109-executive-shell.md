# MAP-109 · Organización ejecutiva del dashboard

Autorización Edu 26/10/2026, tras validar funcionalmente MAP-108. Referencia: captura 220455; fuente de marca vigente y estándar transversal v1.4 ya verificados en MAP-108. Distribución de referencia, sin adoptar azul ni tipografía ajena a FIBRAZO.

Cambios de presentación: cabecera institucional compacta; navegación horizontal sin tarjetas; acceso a Competencia; avatar con correo, versión, formularios activos, sincronización, pendientes y cierre de sesión (mismos nodos/IDs/permisos); panel izquierdo contraíble desde el mismo botón hamburguesa; espacio de mapa recuperado al cerrar panel en escritorio; búsqueda compacta; un solo control visible Solo mapa; título e icono Detalle del punto; marcadores sin contorno blanco conservando clasificación/colores y marcas QA.

La capa base OpenStreetMap existente recibe tratamiento oscuro CSS aislado en su contenedor, sin modificar polígonos ni marcadores ni incorporar proveedor/credencial externos. Vista satelital conserva colores originales. Formularios, sincronización, fotos, datos, automatizaciones y contratos de navegación 108 no se modifican.

QA: suite Forms completa aprobada tras cambios de shell. Escenario qa-executive-109.html solo Preview, sin datos reales ni tokens válidos; debe retirarse antes de publicación. Incluye viewport móvil 390×844 en iframe. Validación visual pendiente. Versión prevista 0.8.162. Reversión: producción anterior 0.8.161, dpl_43HJMQuEqQeQDcwqBdR8orJ5r3M1 / runtime fa008f1382707747f3aa8f9a2571e7c5301b8f35; sin migración.

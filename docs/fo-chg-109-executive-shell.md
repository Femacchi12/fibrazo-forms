# MAP-109 · Organización ejecutiva del dashboard

Autorización Edu 26/10/2026, tras validar funcionalmente MAP-108. Referencia: captura 220455; fuente de marca vigente y estándar transversal v1.4 ya verificados en MAP-108. Distribución de referencia, sin adoptar azul ni tipografía ajena a FIBRAZO.

Cambios de presentación: cabecera institucional compacta; navegación horizontal sin tarjetas; acceso a Competencia; avatar con correo, versión, formularios activos, sincronización, pendientes y cierre de sesión (mismos nodos/IDs/permisos); panel izquierdo contraíble desde el mismo botón hamburguesa; espacio de mapa recuperado al cerrar panel en escritorio; búsqueda compacta; un solo control visible Solo mapa; título e icono Detalle del punto; marcadores sin contorno blanco conservando clasificación/colores y marcas QA.

La capa base OpenStreetMap existente recibe tratamiento oscuro CSS aislado en su contenedor, sin modificar polígonos ni marcadores ni incorporar proveedor/credencial externos. Vista satelital conserva colores originales. Formularios, sincronización, fotos, datos, automatizaciones y contratos de navegación 108 no se modifican.

QA: suite Forms completa aprobada tras cambios de shell. Escenario qa-executive-109.html solo Preview, sin datos reales ni tokens válidos; debe retirarse antes de publicación. Incluye viewport móvil 390×844 en iframe. Validación visual pendiente. Versión prevista 0.8.162. Reversión: producción anterior 0.8.161, dpl_43HJMQuEqQeQDcwqBdR8orJ5r3M1 / runtime fa008f1382707747f3aa8f9a2571e7c5301b8f35; sin migración.


Preparación de publicación: se retira el escenario sintético del árbol de producción. Suite Forms completa PASS; comprobación adicional conserva los 191 IDs originales, sin cambios de API, cola offline, configuración de formularios ni motor territorial. QA sintético: menú de cuenta desplegable; Solo mapa 1363×936; ancho de mapa 1043→1363 al contraer panel; retorno correcto. Último candidato de QA ba3338f ajusta espacio de popup bajo herramientas, evita partición de pestañas móviles, alinea pendientes y quita halo en triángulos. La validación con sesión real y teléfono físico se registra separada de la prueba en iframe 390×844.

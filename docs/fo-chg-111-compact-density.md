# FO-CHG-111 — Densidad ejecutiva

Versión 0.8.164. Base/reversión: main 6fe9faba24f6e39b919a0a693049d445ca1a02b0, producción 0.8.163 b5dbec3886132557471c0285e5122cc7a4068efc / dpl_E5iFwQF53DtbC2o4Waat5hEqWghw.

Se acota el ancho de lectura de Reportes/Administración a 1080 px y catálogo a 820 px, se compactan navegación, filas, KPIs, disclosures y separadores. Se eliminan marcos decorativos en componentes reales admin-person-permissions/admin-status-group y se conserva borde de campos, indicadores, estados dirty y controles. No se reduce tipografía. Mapa mantiene superficie y bordes blancos restaurados; formularios de campo, datos, APIs, permisos y sincronización sin cambios. Detalles mantiene botón fijo y wrapper de contenido de navegador en segunda fila completa.

QA: usar fixture sintética solo en rama de pruebas; administración usa renderer real con fetch interceptado y escrituras bloqueadas. No incluir fixture en producción. Pruebas y publicación se registran al verificarse.

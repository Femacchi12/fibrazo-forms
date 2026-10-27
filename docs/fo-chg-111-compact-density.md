# FO-CHG-111 — Densidad ejecutiva

Versión 0.8.164. Base/reversión: main 6fe9faba24f6e39b919a0a693049d445ca1a02b0, producción 0.8.163 b5dbec3886132557471c0285e5122cc7a4068efc / dpl_E5iFwQF53DtbC2o4Waat5hEqWghw.

Se acota el ancho de lectura de Reportes/Administración a 1080 px y catálogo a 820 px, se compactan navegación, filas, KPIs, disclosures y separadores. Se eliminan marcos decorativos en componentes reales admin-person-permissions/admin-status-group y se conserva borde de campos, indicadores, estados dirty y controles. No se reduce tipografía. Mapa mantiene superficie y bordes blancos restaurados; formularios de campo, datos, APIs, permisos y sincronización sin cambios. Detalles mantiene botón fijo y wrapper de contenido de navegador en segunda fila completa.

QA: usar fixture sintética solo en rama de pruebas; administración usa renderer real con fetch interceptado y escrituras bloqueadas. No incluir fixture en producción. Pruebas y publicación se registran al verificarse.

Verificación previa: npm run test:forms completa aprobada; 191 IDs originales únicos; git diff --check y sintaxis service worker aprobados. QA 00d01ea32e71567c25eba0e352a58679570492e6 / dpl_4tDJyUDreJdtsJUtAmTmiecYcqJB READY: escritorio Reportes 1080 px / 520 px de alto, KPI 85 px; catálogo 820 px; renderer real de Administración con dos administradores sintéticos y cuatro formularios; viewport móvil 390×844, detalles conserva x266/y207, cuerpo expandido 350 px. Prueba física y sesión real pendientes de Edu. Solo CSS, versión y caché, sin APIs ni JS de negocio modificados. Fixture excluida de la entrega.

# FO-CHG-113 — Cuenta, ubicación y aislamiento de gestos

Versión 0.8.166. Base d9d2d586714da6c1c424bf95ca0da71b3605d3aa; reversión 0.8.165 / e1a2073cddb1a8c109ef8531c3ec04bea0b04b7b / dpl_33h3io78ZREmCa9y6he3WSKHvPy4.

Mi cuenta: correo, métricas en línea, estado/salida y pendientes con jerarquía compacta. Se mueven los nodos originales sin duplicar ID ni eventos. Ubicación: diana con punto azul (indicación GPS solicitada por Edu), etiqueta accesible original y mismo evento/GPS. Paleta institucional general intacta. Popup: elimina gap entre filas, columnas de etiqueta cortas y datos más próximos, tipografía legible, scroll propio.

Causa del bug: installLongPressSelection excluía controles pero no .leaflet-popup; presionar barra de scroll disparaba temporizador 720 ms y acciones de coordenada. Corrección: guardia para UI/popups, solo botón primario en long press; al abrir popup se cancela gesto pendiente y se aísla propagación click/scroll/pointer. Contexto y long press sobre fondo se conservan. No cambia datos, APIs, permisos, sincronización, geolocalización ni reglas territoriales. QA, pruebas y publicación se documentan al verificarse.

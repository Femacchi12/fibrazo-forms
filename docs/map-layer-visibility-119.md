# FO-CHG-119 · Visibilidad en el mapa

El ojo indica visibilidad: abierto para contenido visible y tachado para oculto. En estratos, barrios y troncales oculta la selección y restaura exactamente la anterior, incluidas las exclusiones cuando se seleccionan todos los barrios. La selección recordada se reinicia al cambiar la ciudad, para no mezclar identificadores de territorios distintos. Sin una selección anterior, el ojo abre la lista para elegir. Permanecen disponibles los controles de seleccionar todos en barrios y troncales.

Ciudades y operadores son filtros, no capas geográficas independientes. Sus ojos conservan los filtros seleccionados: ocultar ciudades oculta puntos y polígonos territoriales; ocultar operadores oculta los puntos. La vista vuelve al estado anterior al reactivar. Los indicadores de las capas territoriales también reflejan cuando Ciudades está oculto.

Verificación: `node docs/check-map-layer-visibility-119.cjs` cubre el ciclo 1-2-3, agregar 4, ocultar y restaurar, selección de barrios con exclusiones, troncales y ocultación de puntos; `npm run test:forms` pasa. La verificación visual y del despliegue se registra en el PR.

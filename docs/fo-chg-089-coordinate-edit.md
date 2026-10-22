# FO-CHG-089 · 22/10/2026 · VALID_COORDINATE_REQUIRED al editar

Edu reportó error rojo al guardar Inteligencia de operadores desde revisión final, con Neiva/barrio ya visibles. La lectura nativa de registros recientes confirma GPS numérico válido en Sheets; su presentación localizada usa coma decimal. No se modificaron esas respuestas durante el diagnóstico.

## Causa

GET /api/submissions leía FORMATTED_VALUE por omisión y devolvía coordenadas como «2,9428962». editIntelligenceRecord usaba Number(texto), produciendo NaN; el objeto GPS seguía existiendo y la validación anterior solo comprobaba su existencia. JSON enviaba lat/lng null y el backend rechazaba VALID_COORDINATE_REQUIRED.

## Corrección

- Historial y lectura del original a editar piden UNFORMATTED_VALUE; GPS/precisión de resultados se normalizan numéricamente, preservando precisión completa.
- Editor admite comas decimales en historiales locales antiguos, mantiene vacíos como ausentes y cancela una captura GPS ajena en curso al abrir un registro histórico. No reemplaza la ubicación del registro con la posición actual del teléfono.
- Validación visual y confirmación exigen coordenada realmente válida, no solo un objeto; retorno a la sección de coordenadas definida por ese formulario. Mensaje amigable en lugar del código técnico.
- Para el formulario antiguo que Edu conserva abierto, el servidor recupera la coordenada de SU MISMA fila original cuando location está ausente o presenta exactamente lat:null/lng:null (firma del editor anterior). Cambios explícitos fuera de rango o parcialmente inválidos siguen rechazándose. No se inventa GPS cuando el original tampoco lo tiene.
- La validación de una edición ocurre después de restaurar el punto original y antes de subir fotos/escribir Sheets. Se mantienen verificaciones de propietario/permisos, datos, fotos y exclusión QA. Se preservan ID, fecha original, fotos anteriores y clasificación. La misma edición puede reintentarse sin duplicar.

## Pruebas

Suite docs/check-coordinate-edit-089.cjs con handler real y validador real de _core; Auth/Google/Drive simulados. Cubre lectura raw, precisión, edición antigua null/null, ubicación omitida, corrección explícita válida, rechazo antes de Drive/escritura, original sin GPS, editor con coma decimal, cancelación de captura y vacíos. Regresión completa npm run test:forms, incluyendo dicha suite. No se envían pruebas productivas.

Nueva caché SW144-20261022-coordinate089 y consultas de assets actualizadas; conserva la corrección de navegación087 y la cola offline. La recuperación de la página ya abierta es de servidor y no exige refrescar ni perder las modificaciones en pantalla: reintentar Confirmar y guardar después de publicación READY. Las siguientes aperturas toman el editor corregido.

Rollback: volver al commit c46643b4c26c854c9dac646ede3b33a25dce61ed con una versión nueva de SW, preservando IndexedDB. No quitar validación de GPS ni completar puntos con coordenadas de otro lugar.

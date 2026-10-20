# FO-CHG-081 · Enriquecimiento territorial en segundo plano

Autorizado por Edu el 20/10/2026: aplicar directamente en producción. Esta implementación sustituye el estado «propuesta no implementada» de FO-CHG-081 en `fo-chg-080-081.md`.

## Comportamiento

En nuevos registros corporativos de EXPLORACION, EXPLORACION_PRESENCIAL e INTELIGENCIA_OPERADOR, una coordenada válida permite revisar y guardar aunque barrio/estrato sigan consultándose. La confirmación guarda primero una copia independiente en IndexedDB y permite abrir otra respuesta. Cada trabajo conserva su ID, coordenada, fotos, clasificación QA y cambios manuales. Una respuesta territorial tardía no puede rellenar el siguiente formulario.

La cola consulta `/api/exploration` con la coordenada original; persiste el resultado antes de enviar a `/api/submissions`. La API existente vuelve a aplicar sus validaciones y reglas territoriales. Se conserva el mismo clientSubmissionId en cada reintento. Un bloqueo transaccional entre pestañas evita envíos simultáneos de la cola. Los fallos de red reintentan con espera creciente; no bloquean otros registros.

La interfaz distingue datos territoriales pendientes, búsqueda, envío, sincronización confirmada y recibido con revisión territorial pendiente. Sólo elimina las fotos locales del registro tras confirmación completa. Una recepción parcial de servidor se conserva para conciliación, sin repetir automáticamente la creación en la base maestra.

## Límites operativos

- Se necesita capturar el GPS del punto o ingresar una coordenada manual válida antes de guardar. No se busca luego la ubicación del siguiente lugar.
- La cola avanza mientras la aplicación puede ejecutarse. Android puede suspenderla al cerrarla; retoma al reabrir con la misma cuenta y conexión. No es un servicio de geolocalización permanente.
- Enlaces públicos y edición mantienen su flujo existente. CHURN conserva su cola habitual sin enriquecimiento territorial nuevo.
- Se preservan correcciones manuales y el estrato observado; la sugerencia QA sólo corresponde a registros expresamente clasificados como prueba. No modifica capas, fuentes canónicas ni reglas de exclusión QA.
- La base IndexedDB mantiene versión 1 y registros existentes. No hay migración ni cambio de esquema del servidor.

## Ícono

Edu confirmó la tercera imagen: corresponde al PNG v8 de FO-CHG-080, letras finas, punto blanco y subtítulo growth forms. Se conserva el original limpio de 192/512 px; la captura enviada contiene recorte/puntero y no se usa como bitmap. SW v0.8.138 renueva recursos y manifest sin alterar ese diseño.

## Verificación y reversión

16 comprobaciones de regresión existentes y dos suites nuevas: cola con IndexedDB simulado (18 escenarios de desconexión, reapertura, dos trabajadores, fotos, pérdida de confirmación, aislamiento, cuenta, manuales y QA) y revisión inmediata/GPS/respuesta tardía. Endpoints simulados en estas suites: no crean datos productivos. Se corrigieron fixtures antiguos para rutas Windows, referencia QA vigente y versiones de script sin fijar una versión histórica.

Rollback: restaurar `index.html`, `ux-v04.js`, `offline-v04.js` y `service-worker.js` del commit 59b4d41953ac6f7d5279ea14bf5e72735080a6ee con una nueva versión de caché. No borrar IndexedDB ni pendientes. Los snapshots nuevos siguen siendo payloads compatibles con el servidor anterior; requieren sincronización o revisión antes de limpiar el dispositivo.

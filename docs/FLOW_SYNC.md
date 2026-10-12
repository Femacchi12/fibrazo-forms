# FIBRAZO Forms · Sincronización de flujos

## Objetivo

El archivo `docs/FIBRAZO_Forms_Flujos.drawio` y los formularios de producción deben mantenerse sincronizados en ambos sentidos.

### Camino A · Formulario → diagrama
1. Se modifica `forms-config.js`, backend o lógica condicional.
2. Se actualiza `docs/flow-sync-manifest.json`.
3. Se actualiza la página correspondiente en `FIBRAZO_Forms_Flujos.drawio`.
4. Código, Sheet y flujograma quedan alineados.

### Camino B · Diagrama → formulario
1. El usuario abre el archivo de GitHub en diagrams.net.
2. Modifica bloques/conexiones y guarda el cambio en GitHub.
3. Solicita: **“aplica los cambios del diagrama”**.
4. Se compara la nueva revisión del `.drawio` con la anterior y con `flow-sync-manifest.json`.
5. Se aplican solo los cambios funcionales al formulario, backend y Sheet.
6. Se actualiza el manifest con el nuevo estado sincronizado.

## Convenciones técnicas

- Sección: `[section:<id>]`
- Pregunta/campo: `[field:<key>]`
- Grupo de preguntas: `[fields:key_1,key_2]`
- Decisión: `[decision:<key>]`
- Las flechas de una decisión deben nombrarse con el valor que dispara la rama, por ejemplo `Sí` y `No`.

## Qué cuenta como cambio funcional

Sí modifica el formulario:
- agregar/eliminar una sección o pregunta;
- cambiar un ID técnico;
- cambiar orden lógico;
- cambiar opciones o requerido/opcional;
- cambiar una conexión o salto;
- cambiar la condición de visibilidad.

No modifica el formulario:
- mover un bloque;
- cambiar tamaño, color o posición;
- reorganizar el lienzo sin cambiar conexiones;
- cambiar una descripción puramente visual.

## Regla de seguridad

Nunca se publica automáticamente un cambio hecho en draw.io. La modificación se aplica cuando el usuario pide sincronizarla, se valida contra las convenciones y luego se actualizan código, Sheet y diagrama de forma controlada.

## Auditoría integral de sincronización FO-CHG-017 — 11/10/2026

### Inventario y fuentes oficiales
- Fuente ejecutable: `forms-config.js` (campos, secciones, tipos, valores permitidos, `required` y `showWhen`), junto con `ux-v04.js` para navegación/validación y `api/submissions.js` para envío/seguridad. `PREGUNTAS` en Sheets es documentación histórica, no editor de producción.
- Diagrama editable único: `docs/FIBRAZO_Forms_Flujos.drawio`. Manifiesto auditable: `docs/flow-sync-manifest.json` (schemaVersion 2).
- Conteos del código al corte: CHURN 5 secciones/20 campos; EXPLORACION 4/22; EXPLORACION_PRESENCIAL 5/27; INTELIGENCIA_OPERADOR 5/25; total: 94 campos declarados.
- Páginas del Draw.io: Churn, Exploración virtual, Exploración presencial, Inteligencia de operadores, Seguridad y publicación, Convenciones y Modo offline. Las tres páginas generales originales se conservan.
- La norma de estilos permanece únicamente en https://docs.google.com/document/d/1prrIG6gikA7rfvadDz2xRF_PnnhtUtMZlJXOagflY_U/edit (v1.4).

### Lectura funcional y reglas
Los nodos `[section:id]` marcan secciones, `[field:key]` campos, `[fields:key_1,key_2]` grupos condicionales y `[decision:key]` sus disparadores. Las bifurcaciones están etiquetadas; las líneas discontinuas son inventario/reglas, no una secuencia obligatoria de respuesta.
El proceso general es: acceso autorizado → pasos activos → validaciones por paso → revisión integral (esperar GPS/enriquecimiento territorial cuando corresponda) → envío → confirmación servidor, cola offline interna autenticada o error/reintento. La captura GPS puede continuar en paralelo a otros pasos del relevamiento de campo; la validación final sigue siendo obligatoria.
En Exploración e Inteligencia se exige al menos un operador observado. Las calidades ISP visibles se validan adicionalmente según `validateField()`. Las fotografías tipo `photos` y `photo-single` se respetan según límites configurados y servidor.

### Incidencia registrada, no resuelta en producción
`EXPLORACION.coordenadas` está declarado como `section:"coordenada"`, pero `EXPLORACION.sections` no contiene esa sección (sólo `ubicacion`, `infraestructura`, `operadores` y `cierre`). `activeSections()` / `renderSection()` trabajan por ID de sección: el campo queda fuera de los pasos y de `validateAll()`. Se preserva literalmente en manifiesto y se señala en Draw.io como **campo huérfano**; NO se alteró el código funcional. Solucionarlo necesita decisión separada sobre su ubicación y prueba de formulario real.

### Procedimiento posterior y QA
Cada cambio futuro debe comparar código, manifiesto y el mismo Draw.io, verificando IDs, campos, opciones, condiciones, requerido y rutas. En la dirección Draw.io → producción primero auditar diferencias y obtener validación de cualquier cambio de negocio. Comprobar que el XML abre en diagrams.net y que las 7 páginas son navegables antes de cerrar QA visual. Mantener las fuentes de permisos, `RESP_*` y `PREGUNTAS` sin modificar como efecto de una simple sincronización documental. Evitar despliegues por cambios sólo documentales.


### Control adicional del Draw.io — 12/10/2026
Se revisaron por lectura estructural las siete páginas del XML actual: 226 vértices, 241 aristas y 94 referencias de campo en las cuatro páginas de formularios. No se detectaron IDs repetidos de campos, extremos de aristas ausentes, elementos fuera del tamaño declarado de sus lienzos ni intersecciones geométricas relevantes entre vértices. Las decisiones documentadas corresponden a motivo, servicio, TV, ISP y tipo de despliegue según el formulario. Esto amplía el QA técnico; NO constituye inspección interactiva real de apertura, zoom, legibilidad, colores, etiquetas y guardado en app.diagrams.net. FO-PEN-005 sigue pendiente de cierre visual.

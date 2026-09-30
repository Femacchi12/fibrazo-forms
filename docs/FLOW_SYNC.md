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

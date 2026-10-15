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


## Política de actualización OBLIGATORIA de todos los formularios — FO-CHG-019, 12/10/2026

**Invariante:** para cada formulario vigente, el formulario funcional, el manifiesto y la página correspondiente del único Draw.io deben representar la misma revisión funcional. NO se debe cerrar una modificación, aprobar un merge ni declarar un despliegue conforme sin actualizar/verificar las tres fuentes y registrar FO-CHG y evidencia.

**Formulario → Draw.io (siempre dentro del mismo cambio funcional):**
1. Registrar la propuesta y el impacto (preguntas, IDs, secciones, orden, opciones, requeridos, condiciones, navegación, fotos/GPS, validación, envío, permisos si corresponde).
2. Implementar y probar los cambios en el código y las hojas autorizadas.
3. Actualizar `docs/flow-sync-manifest.json` y `docs/FIBRAZO_Forms_Flujos.drawio`, sin crear otra copia canónica.
4. Ejecutar `node docs/check-flow-sync.mjs` y comparar visualmente con diagrams.net. Verificar ramas Sí/No, rutas, etiquetas, destinos y manejo de error/offline.
5. Registrar commit, pruebas, estado de publicación y pendientes en CAMBIOS/PENDIENTES; cerrar solo si todas las verificaciones pertinentes pasan.

**Draw.io → formulario (aplicación bajo solicitud expresa):**
1. Guardar el cambio sobre el mismo archivo de GitHub, manteniendo IDs `[field:...]`, `[section:...]` y `[decision:...]`.
2. Revisar el diff contra la revisión previa y el manifiesto; separar cambios solo gráficos de cambios funcionales.
3. Si el cambio es funcional, solicitar “aplica los cambios del diagrama”, revisar impacto y aprobar criterios del formulario.
4. Aplicar el cambio al código, a los datos/configuración necesarios, a la página Draw.io y al manifiesto, ejecutar QA, registrar FO-CHG y publicar controladamente cuando Vercel lo permita.
5. **Nunca editar el gráfico altera automáticamente el formulario publicado.** No convertir un movimiento de cajas en cambio de reglas.

**Prueba estructural repetible:** `node docs/check-flow-sync.mjs` verifica inventario de formularios, campos, orden, secciones, opciones, requerido, condiciones showWhen, correspondencias con etiquetas del diagrama y extremos de aristas. Es una comprobación local bajo demanda, NO un job CI ya instalado ni un sincronizador automático. No certifica texto interno, lógica completa de bifurcaciones ni inspección visual interactiva. A esas verificaciones se llega por revisión humana/QA funcional antes de cerrar.

**Excepción controlada abierta:** FO-PEN-004 (EXPLORACION.coordenadas huérfanas) queda registrada y NO se corrige sin nueva instrucción. FO-PEN-005 sigue pendiente de la apertura y legibilidad reales en diagrams.net. Estas excepciones deben acompañar el cambio hasta su cierre validado.

**Control de despliegues:** ediciones meramente documentales no deberían consumir nuevas versiones de aplicación. Para cambios funcionales, comprobar el despliegue real en Vercel; código en GitHub no equivale a producción.


## Control de pruebas y consistencia del mapa — FO-CHG-021 — 13/10/2026

**Estado:** implementado en rama de desarrollo `feat/forms-map-qa-20261013`. Pendiente de revisión visual, QA real y publicación de producción. No declarar publicado solo por existir el código.

### Formularios → Draw.io y datos
- En el último paso de **los cuatro formularios**, inmediatamente antes de `Revisar respuestas`, únicamente `eduardo@fibrazo.com` ve `¿Este registro es una prueba?` con **No preseleccionado**. No aparece en pasos anteriores ni se repite en la pantalla de revisión. No forma parte de las 94 preguntas propias: es una bandera de metadatos de envío.
- El servidor valida el correo **a partir del token autenticado**, no del payload. `isTest:true` de cualquier otro usuario provoca 403. El modo público no permite el control.
- El estado queda en la columna aditiva `Es_Prueba` de `RESP_CHURN!AC`, `RESP_EXPLORACION!CE` (se preservan columnas históricas BY:CC), o `RESP_INTELIGENCIA_OPERADOR!AF`; no desplazar el esquema anterior.
- **Sí** se guarda en la hoja de respuestas con ID, usuario y estado para auditoría de QA; no se cuenta en resultados, reportes ni catálogo de ISPs. En Exploración no genera puntos u observaciones en la base maestra Bucaramanga ni consume el límite de una respuesta real. La cola offline conserva la marca, pero el servidor vuelve a verificar el acceso al recibirla. No significa borrar la prueba.
- En el mapa, **las pruebas están ocultas por defecto**. Solo el mismo usuario autenticado puede habilitar `Mostrar pruebas (QA)` y obtener sus puntos con coordenadas. Los marcadores de prueba tienen distinción visual y están excluidos de los KPI aun cuando se muestran. No se habilita esta recuperación a otros administradores.
- El diagrama Draw.io contiene un flujo auxiliar `[decision:es_prueba]` en **cada una de las cuatro páginas**. El manifiesto `qaTestFlow` registra la regla, las columnas y la excepción. `node docs/check-flow-sync.mjs` valida las cuatro decisiones. La incidencia preexistente `FO-PEN-004` sigue pendiente, **sin corrección funcional**.

### Mapa y reglas de UI
- `FO-PEN-007`: el usuario puede tipear para buscar/seleccionar en los filtros con listas de opciones; conserva la selección real en el elemento `select`, permisos, opción Todos, teclado, tildes, búsqueda de barrios y controles distintos (fechas/casillas). **Aplicar como convención a nuevos filtros de selección.**
- `FO-PEN-008`: estratos `1=#22C55E (verde), 2=#FACC15 (amarillo), 3=#3B82F6 (azul), 4=#EF4444 (rojo), 5=#A855F7 (morado), 6=#EC4899 (rosa)` en polígonos, selector y referencia, sin alterar categorías cromáticas de operadores.
- `FO-PEN-009`: controles únicos de filtros, capas y leyenda en panel flotante desplazable/contraíble en escritorio, compacto en móvil. No duplica lógica/estado; la referencia de estratos se mantiene visible mientras esté expandido.
- `FO-PEN-010/012`: coordenadas de puntos existentes y clic derecho/pulsación prolongada copiables al tocarlas, con confirmación; botón `Ir a Google Maps` abre búsqueda del marcador exacto (`maps/search`), nunca instrucciones de ruta. Se conserva contexto territorial y acceso a formularios.

### Pruebas y publicación
Requeridas antes de cerrar los tickets: control de permisos (Eduardo/otro/anonimato), No predeterminado, colas offline y reintentos, prueba que no entra a base maestra ni indicadores, filtro del mapa, popup/copiar/enlace externo, selección escribible/foco/Enter/Escape, movimiento y minimizado del panel, y CSS/móvil (320/360/390/430 px) y escritorio; contrastar datos preexistentes sin modificación. Todo cambio funcional de formulario exige actualizar código/hojas/manifest/diagrama/manual/CAMBIOS según FO-CHG-019. La suite estructural no reemplaza QA visual/autenticada.


### Cierre de cobertura de búsqueda de filtros — 13/10/2026
Además de ciudad, formulario, operador y usuario, el selector de estratos permite teclear y filtrar sus seis casillas; el selector de barrios mantiene su búsqueda previa. Ningún filtro de lista nuevo se considerará completo sin búsqueda por escritura y prueba de teclado y móvil. Búsqueda cambia solo opciones mostradas, no desmarca selecciones ocultas. Integrado en el PR #24, pendiente QA visual y producción.


### FO-CHG-022 — Ajustes de QA visual del mapa y bandera de prueba — 13/10/2026
Tras captura del usuario en Preview, se eliminó la barra redundante de Filtros/Capas y basemap sobre la búsqueda. Los botones Mapa/Satélite se conservaron dentro de la pestaña Capas. El panel flotante tiene tres pestañas Filtros, Capas y Referencia; la leyenda de los seis estratos vive SOLO en Referencia. Los filtros tipables tienen etiquetas visibles y se ordenan de uno por fila; fotos, QA y fechas quedan en Opciones adicionales contraíbles. Las capas Barrios/Estratos tienen detalles desplegables y botones de activación con indicador visual de check (aria-pressed sigue siendo la fuente de estado), manteniendo controles originales. Las coordenadas son ahora un enlace tipográfico discreto y el clic muestra aviso breve «✓ Copiado» cerca del número; se conserva apertura del punto en Google Maps, no ruta.
La bandera «¿Este registro es una prueba?» quedó inicialmente duplicada entre el formulario y la revisión final. Esta ubicación fue reemplazada por la regla FO-CHG-025: un único selector en el último paso, inmediatamente antes de «Revisar respuestas». No predeterminado y controles del servidor permanecen intactos.

### FO-CHG-025 — Cierre visual del formulario y panel del mapa — 14/10/2026
La bandera QA se muestra una sola vez y únicamente en el último paso de cada formulario para la cuenta autorizada; no aparece durante las demás secciones ni se repite en la revisión. El panel flotante queda limitado a los bordes del mapa, con cuatro esquinas redondeadas y scroll interior. Filtros y capas se ordenan verticalmente. Referencia contiene tres índices desplegables: estratos, formas de los elementos y operadores. Se eliminan los badges «Vista · equipo completo» y «Actualización automática» sobre la búsqueda; el buscador se hace más compacto y el encabezado alinea textos y acciones con márgenes consistentes. No cambia preguntas, permisos, respuestas ni contrato de API.

### FO-CHG-026 — Precedencia visual del panel del mapa — 14/10/2026
La validación autenticada del Preview detectó que `brand-alignment.css`, cargado después de `styles.css`, reponía una cuadrícula de cuatro columnas mediante `!important`. Se corrige la fuente de esa precedencia para conservar una sola columna en Filtros en escritorio y móvil. La misma capa transversal deja de dibujar un borde cuadrado dentro del buscador: el contenedor mantiene radio de 14 px y el campo interior queda transparente, compacto y sin borde duplicado. No se altera lógica, datos, permisos, filtros ni endpoints.

### FO-CHG-027 — Filtros múltiples y carga territorial optimizada — 14/10/2026
Ciudad, formulario, operador y usuario conservan el selector nativo como fuente de estado, pero admiten varias opciones simultáneas. Cada selección aparece como chip removible y el campo de búsqueda vuelve a quedar vacío para mostrar o escribir la siguiente opción. Dentro de un filtro se aplica lógica OR; entre filtros se conserva lógica AND. Las ciudades se agrupan por valor normalizado y se presentan con mayúscula inicial, sin reescribir respuestas históricas. Barrios y Estratos reutilizan sus controles existentes dentro de desplegables buscables y multiselección; el filtro de ciudad limita también su catálogo territorial. Mapa/Satélite pasa a un único botón contextual junto a Pantalla completa. El diálogo de punto seleccionado es movible en escritorio y compacta coordenadas con el botón `Ir` en una fila. La carga de polígonos añade caché breve del cliente, caché de geometrías procesadas en la función, cuantización de viewport y debounce de selección/movimiento; no simplifica ni modifica la geometría fuente.


### FO-CHG-030 — Controles Capas QA (14/10/2026)
Barrios y Estratos muestran flecha expandir/contraer. Estratos presenta nombres sin conteos de polígonos; Barrios muestra búsqueda y multiselección, botones Seleccionar todos/Limpiar alineados, sin contador ni control Vista actual/Todos. No modifica las geometrías.

### FO-CHG-031 — Salvaguarda geográfica (14/10/2026)
Incidente: 7.133875,-73.124286, punto contenido en el polígono DANE de Bucaramanga, aparecía como Cartagena a 409 km. La causa última no quedó demostrada por logs (403 Vercel). QA añade logging de falla de lectura municipal, máximo 20 km para municipio cercano, 5 km para barrio/estrato y 10 km para troncal. Si no hay fuente confiable: FUERA_COBERTURA sin municipio remoto. DENTRO prevalece. Caché de coordenadas V2 expira a cinco minutos. Verificar municipios AMB, Cartagena y coordenadas fuera de catálogo.

### FO-CHG-032 — Pendientes dinámicos (14/10/2026)
Fuente única Google Sheets FIBRAZO Forms - Automatizaciones y control, pestaña PENDIENTES (ID 1khSXy3s44k6wuRrIjP5-an9C5Kr1qPpAF6iWECKrI3c). Se reemplaza la lista fija de tres asuntos por GET /api/pending autenticado (token Firebase + permiso dashboard), lectura vía cuenta de servicio y caché servidor 90 s. Activos suman al contador, pausados se listan sin sumar, cerrados no se muestran. El cliente consulta al iniciar sesión/abrir y refresca cada 120 s visible; si falla el acceso, muestra error, nunca datos supuestamente actuales. No escribe estados. Agregados FO-PEN-014/015; FO-PEN-005 conciliado con FO-CHG-029. Pendiente E2E y comprobar acceso de cuenta de servicio antes de producción.


### FO-CHG-033 — Panel Capas compactado, estratos predeterminados y controles fijos (15/10/2026)
En QA, Estratos se inicia con 1, 2 y 3 seleccionados (estrato 0 no figura en las opciones). Se oculta el control Leaflet +/− preservando zoom por gestos. El panel se ancla arriba a la izquierda; abierto se cierra con «−» y contraído solo muestra «☰» para abrir. Se elimina arrastre del panel; Barrios/Estratos se representan como listas desplegables compactas con indicador, sin divisores repetidos, manteniendo búsqueda y selección múltiple. Cambios: map-v01.js, map-controls-ui.js, styles.css, index.html y service-worker.js. Solo rama feat/forms-map-qa-20261013; quedan pruebas visuales desktop/móvil y confirmación de publicación Preview READY; producción no tocada.

FO-CHG-033 (identidad PWA): se sustituye icon-fzo-growth-form-v6.svg por marca fbz verde con punto y leyenda growth forms grande, como aproximación vectorial de la imagen aprobada; requiere revisión visual en dispositivo y reinstalación/actualización de acceso directo para actualizar iconografía.


### FO-CHG-034 — Herramientas compactas del mapa (15/10/2026)
En QA se retiran de la cabecera los botones Actualizar y Ver todos los puntos; se incorpora una lupa dentro del mapa que despliega el buscador; Mi ubicación pasa a botón cuadrado con icono; Iniciar/Limpiar recorrido y Seguir mi ubicación se agrupan en un menú desplegable. El panel flotante ajusta su altura a la zona visible con scroll interno. Barrios/Estratos conservan selección múltiple, presentan opciones sin recuadros densos y disponen de una sola acción contextual Seleccionar todos / Ocultar todo. Se mantiene la capa inicial de estratos 1, 2 y 3 sin estrato 0. Requiere validación visual y funcional en QA escritorio/móvil antes de producción.


### FO-CHG-036 — Herramientas, filtros y Troncales (15/10/2026)
- UX QA: lupa se desplaza a la derecha del panel cuando está abierto y queda junto a la hamburguesa cuando se cierra; Mi ubicación se sitúa abajo a la derecha para no tapar botones superiores; los controles de recorrido se identifican en su menú desplegable.
- Cabeceras de Barrios, Estratos y Troncales: control ocular accesible con ojo tachado para «Ocultar todo» (si hay selecciones) y abierto para «Mostrar todo» (si no hay ninguna). Se conservan casillas y búsquedas independientes; un botón por capa, sin repetir «Limpiar».
- El selector de ciudad consulta /api/map-city-catalog con permisos de dashboard y enumera los Municipios_Ambito de las filas ACTIVAS del catálogo corporativo 01_CIUDADES (no solo ciudades con puntos en pantalla). Tipo de formulario, operadores y usuarios quedan condicionados por la selección de ciudad y se presentan como desplegables compactos.
- La capa Troncales cuenta con soporte de API para 04_TRONCALES y líneas WKT; su selector informa «Sin troncales registradas» porque en la fecha de revisión 04_TRONCALES tenía encabezados pero cero filas. No se simulan trazados.
- Las geometrías actualmente servidas por /api/map-polygons son del maestro territorial de Bucaramanga; al seleccionar otras ciudades aparece una advertencia de cobertura, sin asumir disponibilidad nacional de barrios/estratos/troncales. No modificar la fuente geográfica ni reportar capa vacía como error de puntos.
- QA pendiente: validar desplazamiento en móvil/escritorio, controles GPS/recorrido, lectura API con usuario autorizado, casillas y los estados de ojo, todas las ciudades de catálogo, condiciones por ciudad, ausencia de troncales, y visualizar geodatos reales cuando Ingeniería cargue troncales. Rama feat/forms-map-qa-20261013, sin producción.


## Cierre documental y traspaso — FO-CHG-038/039 (15/10/2026)
**FO-CHG-038 — Jerarquía visual de fondos (QA):** grandes paneles y encabezados conservan verde oscuro sólido (#101B15); controles pequeños, filas, tarjetas y acordeones internos, campos y popups del mapa adoptan oscuro sólido (#090F0C) con texto blanco. Cambios en brand-alignment.css, index.html y service-worker.js. Sin cambios de negocio ni producción.
**FO-CHG-039 — Controles del mapa (QA):** referencia con superficies oscuras y letras blancas; menú de iniciar/limpiar/seguir recorrido presentado verticalmente; listados de filtros con casillas como las capas; Barrios y Estratos sin marcos internos decorativos, menos márgenes y sin puntos verdes en el listado de barrios. Cambios en map-controls-ui.js, brand-alignment.css, index.html y service-worker.js.
**Validación pendiente:** el código y el registro corporativo están actualizados, pero hace falta comprobar en navegador la compilación más reciente de QA, la legibilidad y funcionalidad en escritorio/móvil, GPS/recorrido, selectores múltiples, capas y modos de mapa. No afirmar que la última revisión se ve en el enlace QA hasta que el alias apunte a un despliegue READY con los cambios; producción sigue sin autorización.
**Continuidad:** seguir el PROTOCOLO DE CONTINUIDAD ENTRE CHATS de README; consultar FO-CHG-030 a 039 y FO-PEN-013 a 016; usar rama feat/forms-map-qa-20261013, el Manual corporativo y el Changelog como fuente de verdad; no repetir trabajos ya cerrados.

### FO-CHG-043 — Controladores unificados del mapa (15/10/2026)
En QA, Ciudades, Operadores, Estratos, Barrios y Troncales comparten una misma fila compacta, tipografía, fondo, contador y despliegue. Troncales deja de estar dentro de «Capas adicionales» y se ubica inmediatamente debajo de Barrios. Los filtros mantienen búsqueda y multiselección; las capas conservan su acción ocular, búsquedas, casillas y carga de geometrías existente. Se actualiza la caché PWA. Producción no modificada; requiere validación visual y funcional en Preview antes de promover.

### FO-CHG-044 — Alineación y compactación final de capas (15/10/2026)
En QA, la fila de cada filtro y capa fija explícitamente el ojo o icono, nombre, contador y flecha en una única línea. Se neutraliza el salto provocado por el orden heredado de los elementos del resumen y se reducen alturas, separaciones, tipografía, buscadores y opciones para aproximar el panel a la referencia compacta, tanto en escritorio como en móvil. Estratos, Barrios y Troncales conservan la misma acción ocular independiente, despliegue, búsqueda/multiselección y lógica de carga existente. Se renueva la caché PWA; producción no modificada.

### FO-CHG-045 — Listas compactas y alcance territorial por ciudad (15/10/2026)
En QA, las opciones internas de Estratos, Barrios y Troncales pasan a filas continuas de 31 px, sin separaciones verticales excesivas. Ciudades y Operadores abren mostrando el catálogo completo, conservan búsqueda y multiselección, e incorporan un ojo para apagar temporalmente el filtro y restaurar su última selección. Los operadores disponibles se recalculan desde los puntos de la ciudad elegida. Al cambiar ciudad, el cliente cancela solicitudes territoriales anteriores, limpia selecciones de barrios/troncales de la ciudad previa, ajusta la vista a los puntos filtrados y vuelve a pedir índices/geometrías con el parámetro de ciudad; respuestas obsoletas ya no pueden dibujarse. La API aplica ciudad antes de intersección y selección y, con una sola ciudad, usa el límite completo de la capa para mejorar completitud sin descargar otras ciudades. Producción no modificada.

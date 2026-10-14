# Auditoría de identidad visual FIBRAZO — 2026-10-10

## Fuente única y alcance
- [Guía de marca y registro maestro](https://docs.google.com/document/d/1vgYxAB-KhkhHMb-zd-eGJLk_UX6QcSjznZ2WnFRd9m8/edit).
- [Estándar visual de dashboards](https://docs.google.com/document/d/1prrIG6gikA7rfvadDz2xRF_PnnhtUtMZlJXOagflY_U/edit).
- [Gobierno y control de cambios](https://docs.google.com/document/d/1rH6nH6qsXolzkq04jCOmej8xeez0JJAJwnjiiiYS1Ps/edit).

Identidad principal documentada: verde `#43FFA5`, negro `#000000`, gris `#58595B`; fuente Montserrat para interfaz general (adaptada de guía documental), Poppins para tablas. Complementarios observados en recursos: morado `#E94CFF`, amarillo `#FFB600`, fucsia `#FF005C` y naranja `#FF5400`. No reemplazar colores de significado funcional en gráficas, prioridades o estados sin revisar accesibilidad.

## Regla de trabajo
Consultar las referencias y documentar propuesta antes de tocar componentes. El contrato de tokens versionado localmente NO sincroniza automáticamente con Drive. Probar diseño de escritorio/móvil y las funciones antes de declarar cierre.

## Estado de implementación
- Los archivos `design/fibrazo-brand.tokens.json` y `brand-alignment.css` se encontraron en el repositorio y la interfaz los referencia directa o indirectamente.
- En Forms y Competencia se agregó la capa «shared shell v1.2» para tipografías, tablas y tokens compatibles con estilos heredados.
- Impacto Social importa `brand-alignment.css` desde `theme-executive.css`; mantener esta ruta.
- Redmine incorpora directamente `brand-alignment.css` en `index.html`.
- Esta auditoría confirma el estado del código, **no una validación visual de despliegue o regresión autenticada**.

## Pendientes de verificación
1. Inspeccionar escritorio y móvil con sesión autorizada: inicio, navegación, filtros, KPI, tablas, gráficos, mapas donde existan.
2. Confirmar publicación del commit en el hosting asociado a cada repositorio.
3. Revisar HEX directos y estilos `Inter` remanentes que anulen tokens por especificidad o estilos inline.
4. Registrar evidencia de captura antes/después y contraste de estado: EN CÓDIGO / PUBLICADO / VERIFICADO.
5. Si cambia el registro de marca, crear cambio controlado y actualizar los cuatro snapshots; no confiar en sincronización automática.

## Ajuste móvil 2026-10-10 — capturas del usuario
Se compactaron los botones de navegación, se limitaron tamaños KPI, se redujo padding en cards, se normalizó el ancho de filtros de lectura de competencia y de últimas respuestas, y se alinearon encabezados dentro del panel. Se implementó en `brand-alignment.css` commit `5f6d6a4c35a8f3fab9ca874d5526fe51d17b7d5b`, y se actualizó la versión de caché en `index.html` commit `101c8452a6ec9e0d27140213451db0a25d96c959`. Se conservaron funciones/datos. Estado: en código, pendiente revisión de todos los apartados sobre dispositivos y producción. No dar por cerrada la auditoría móvil hasta inspección visual.

## FBZ-UI-DENSITY-20261010-03 — tamaños móviles estandarizados
Solicitud aprobada por usuario tras capturas: compactar Abrir formulario y bloques TIGO/CLARO Sí/No, aplicando reglas coherentes a Forms. Token CSS: primario 46px, secundario 44px, selector visual 54px, radio 12px, separación 10px. Nombres operador 13px, valor Sí/No 17px, hint 11px, padding tarjeta 12px, cards generales 14px, KPI 88px min. Mantener un área táctil ≥44px y semántica de operador. Archivo modificado: `brand-alignment.css` commit `eb7336d1bfb8ccd07fe11e123c856e27aa9a162f`. Cache bust `index.html` commit `10fbb8432f8fffcc837a966041b1a4c7850d5d2e`. Control de cambio: `FO-CHG-004` en hoja Cambios Forms. Estado: implementado en GitHub, pendiente prueba de móvil autenticada y despliegue; no se modificaron cálculos ni backend.


## FO-CHG-005 — Previews minimizadas y escala móvil compacta (2026-10-10)
- Solicitud: mostrar solo **título + Abrir formulario + Ver detalles** inicialmente. Descripción, categoría, estado, enlace, Copiar y Base de datos se consultan al desplegar; los chips informativos no se generan.
- Implementación: `app.js` usa `<details>` nativo cerrado, mantiene `.form-card .form-open-button` y eventos de Copiar, junto a permisos existentes de Base de datos. CSS `brand-alignment.css` escala tarjeta a 10px de padding móvil, CTA 38px, controles Sí/No 46px, acciones generales ~40px.
- Actualización de caché: `index.html` solicita `app.js?v=2026.10.10.05` y `brand-alignment.css?v=20261010-05`; `service-worker.js` cambia nombre de caché e incorpora CSS.
- Commits: `1ad5f461` (preview), `b3eecb2b` (CSS), `e1bd407f` (asset versions), `91d5dda7` (SW cache).
- Historial Drive: [FO-CHG-005](https://docs.google.com/spreadsheets/d/1InVJe0iR0-GAebf-SB5sa9fZRcNmm8N1ShU62Pu-YAc/edit), preferencias [VIS-006/007/008](https://docs.google.com/spreadsheets/d/1khSXy3s44k6wuRrIjP5-an9C5Kr1qPpAF6iWECKrI3c/edit).
- Estado: **implementado y comprobado en repositorio**. Pendiente publicación verificada y QA móvil de apertura, despliegue, copiar, permisos de Base de datos, auth, GPS, respuestas, PWA/offline, y pruebas en tamaños pequeños. No afirmar cierre de producción.


## FO-CHG-006 — Densidad ejecutiva móvil (2026-10-10)
Estado: **implementado en código**, aún **sin verificar en producción**.

Fuente: nuevas capturas de formularios de operadores, ISP, puntuaciones y navegación. Contrato visual aprobado por solicitud: compactar barra superior con identidad redundante omitida solo en esa barra, stepper 38px, sección 19px, tarjeta de pregunta 9px, toggle Sí/No 40px, memoria operadores 38px, rating 1–5 37px, input ISP 39px (tipografía 16px para zoom iOS), footer 39px, CTA preview 36px, KPI 74px y botones mapa 38px. Conservar el contraste semántico y el acceso a datos del formulario.

Archivos modificados:
- brand-alignment.css: commit 949943a119f7a160337e6afac98288e4440b503d
- index.html: commit d3b8689c9f00a5465e645fbb28701076a1c51dcf
- service-worker.js: commit 832ef23fd2eaf94d000544c1f41e984ea7ea8b5f

Registros: [FO-CHG-006](https://docs.google.com/spreadsheets/d/1InVJe0iR0-GAebf-SB5sa9fZRcNmm8N1ShU62Pu-YAc/edit), [VIS-009](https://docs.google.com/spreadsheets/d/1khSXy3s44k6wuRrIjP5-an9C5Kr1qPpAF6iWECKrI3c/edit). CSS comprobado estáticamente, incluyendo balance de llaves, enlaces, cache bust y persistencia de lógica. Falta prueba manual de usabilidad, zoom, offline/PWA, permisos, pasos, mapa/GPS y publicación Vercel. Revertir 3 commits en caso de regresión.


### FO-CHG-006B — Extensión transversal a inicio, acceso, resultados, competencia y administración
Con el mismo cambio aprobado se añadió una capa móvil final de consistencia (marcador `FBZ-DENSITY-20261010-06B`). Incluye caja de inicio Google, cabecera, navegación, KPI, filtros de resultados, tarjetas de biblioteca, títulos de mapa y resúmenes de administración. La versión desplegable final del CSS es `20261010-07`; caché PWA `fibrazo-forms-v0.8.90-20261010-07`.
Commits: `5d3a0ee38e6684c1369ff49f590bc96675365327` (CSS), `022504418768836d67e9517b8cffcb31c3b49bc2` (HTML), `768403714be8db88ee2213140861b1e9b244b2d9` (SW). No se modificó backend o interpretación de respuestas. Verificación visual publicada aún pendiente por limitaciones de acceso a Vercel.


## FO-CHG-007 — Delimitación de ítems y contornos de paneles (2026-10-10)
Cambio solicitado con captura Android: diferenciar visualmente tarjetas de Infraestructura, sin sacrificar la densidad v2 ni recalcular indicadores.
- Normal: borde de pregunta #71877B y sombra interior suave, panel #62766B, ambos **colores auxiliares de interfaz**, no nuevos colores oficiales FIBRAZO.
- Foco: #43FFA5. Error/invalid: #EF6B72 y prevalece sobre foco. Selecciones 1–5 conservan el verde; estados Sí/No mantienen sus colores y etiquetas. ISP sin operador se mantiene neutral, desconocido amarillo y conocido verde.
- Cobertura: tarjeta de pregunta, rating con descripción, selección ISP, GPS, fotos, tarjeta preview, KPI, búsqueda del mapa, filtros, tabla y secciones de Administración.
- No se cambió tamaño, altura, padding, lógica de formularios, datos ni APIs. No se bordea cada celda de tablas.
- CSS: `brand-alignment.css` marcador `FBZ-FIELD-OUTLINES-20261010-08` commit `77c516ab10321b5bc9cd1172ef37b52ac4747d0b`.
- HTML: CSS version `?v=20261010-08` commit `ef413916b389c5747b0a509f691d62b4a37dd63c`.
- Cache PWA `fibrazo-forms-v0.8.90-20261010-08` commit `ef4e945b77b5cf1f31952846e5e0e8e72badd03a`.
- Drive: [FO-CHG-007](https://docs.google.com/spreadsheets/d/1InVJe0iR0-GAebf-SB5sa9fZRcNmm8N1ShU62Pu-YAc/edit), [VIS-010](https://docs.google.com/spreadsheets/d/1khSXy3s44k6wuRrIjP5-an9C5Kr1qPpAF6iWECKrI3c/edit).
- Verificación estática de archivos pendiente de cerrar; publicación Vercel y pruebas autenticadas/visuales de móvil, escritorio y PWA **no confirmadas**.

## FO-CHG-008 — Bordes v2 después de verificar producción (2026-10-10)
El usuario seguía viendo bordes similares. El alias Vercel retornó READY en commit ef4e945b, que incluía CSS v=20261010-08. La causa detectada fue el contraste insuficiente, no la ausencia de publicación.
Se implementó el bloque CSS FBZ-FIELD-OUTLINES-V2-20261010-09: borde neutro de doble trazo visual #A5BFB0 más línea interior de 3 px #8CC5A5 por pregunta. Al foco se usa #43FFA5; con error #EF6B72. Paneles generales tienen borde #879E90. Sin cambios de tamaño, lógica o datos.
Commits: CSS 830861bc861fb9a6cebf5de24d8a3e4ac7e6b617; index/cache CSS 11b2660e4207b6bcf01669c93706ea377625e166; PWA SW ef10f4582b83bdface980238940e3386c49ce45a.
Registro en Drive: FO-CHG-008 (CAMBIOS) y VIS-011 (PREFERENCIAS_DASH). Publicación nueva versión 09 y prueba visual autenticada pendientes.

## FO-CHG-009 — Coordenadas: layout ejecutivo y entrada manual plegada (2026-10-10)
Origen: captura Android 23:50 y solicitud de reorganizar acciones sin eliminar funciones. Aplicado a campos GPS de Coordenadas en Exploración e Inteligencia de operadores, manteniendo otros mecanismos de Churn.
Vista: lectura de coordenada arriba, dos acciones Copiar y Google Maps, tres opciones Automático por GPS / Mejorar precisión / Buscar coordenada; manual se expande y ofrece Aplicar coordenada con validación. Se eliminaron la descripción de la sección Coordenada, la ayuda redundante del campo, el selector duplicado de modalidad y el botón Captar GPS separado. Estado municipio/precisión se muestra en formato compacto cuando corresponda.
Se reutiliza captureGps, parseCoordinateText y resolveExplorationMunicipality. Se preservan medición de precisión, detección territorial, estados e integración de selección de punto desde mapa; el texto del botón automático se restablece después de captura. No se alteraron APIs ni datos.
Archivos/commits: ux-v04.js e15e3083fb72376db38e09b82f1b73be3fd2d8c7; brand-alignment.css 2183ed8173b85c7c01a70a4837a1b78bf65333b0; index.html ec323f06ffd47d43e291e09ab2032a836e8dcc0e; service-worker.js 3c97ede3efc12a3166b80b16be1ae30076431e51.
Registro CAMBIOS: FO-CHG-009; preferencia VIS-012. Estado: IMPLEMENTADO EN CÓDIGO, QA funcional y visual de despliegue pendiente. Probar GPS, mejora de precisión, manual válida/errónea, copia, Maps, ubicación desde mapa, transición entre pasos, detección municipio y modo offline/PWA.

## FO-CHG-010 / VIS-013 — Coordenadas con campo único y GPS contextual (2026-10-11)
Se implementa un único input editable. El botón Buscar coordenada permanece deshabilitado ante texto vacío o formato/rango inválido. Al pulsarlo aplica la posición manual, actualiza state.gps y ejecuta lectura territorial. Texto escrito pero no aplicado bloquea la navegación; Copiar y Google Maps requieren valor aplicado. GPS reemplaza texto al obtener una posición correcta y cambia su botón de Automático por GPS a Mejorar precisión. Volver a escribir en el campo lo retorna a Automático por GPS. La vista ya no genera el segundo editor manual ni dos acciones GPS. No se alteraron llamadas al backend.
Commits: ux-v04.js c04e3fe720eeb0c33393a76ab36e0af6c28f37b0; ajustes ed0b58859a9323f30369c6e31daa00a03529dd87 y 932b4503d17a48023c2d1d76c403c608b209c143. El método captureGps original se reutiliza y se evita autoavanzar desde el nuevo panel.
## FO-CHG-011 / VIS-014 — Borde externo completo para ítems
Cada tarjeta de pregunta lleva 2px de contorno neutral auxiliar #B4C7BA, línea lateral interior 3px #A2C8B1, gap entre tarjetas 11px y fondo #111914. Controles internos se atenúan, excepto selección verde y error rojo. No introduce nuevo color de marca ni altera lógica del formulario. Archivo brand-alignment.css, commit bd74cf8198c9e81dc8e878bb57071e79d85a04c5.
Publicación de assets: index.html da07edb583a2fc853978b99a90a4c4497d91fce4; service-worker.js 7609e3aa31bae7a332e5e705ebdb91dadcc684e2. CSS ?v=20261011-11, JS ?v=2026.10.11.11, caché PWA 20261011-11.
Pruebas estáticas realizadas: sintaxis JS, balance CSS, y una simulación aislada de campo vacío/inválido/válido, búsqueda manual, reemplazo GPS y cambio contextual del botón. Pendiente confirmar despliegue y QA Android con GPS real, permisos, Mapas, municipio, modo sin conexión y flujo de secciones.
## Regla de ejecución: chat único del proyecto
Las implementaciones y el seguimiento de Forms, Exploración y Competencia se gestionan en este chat y se documentan en los manuales y registros de cada proyecto. No proponer mensajes para copiar a otros chats. Iniciar cambios con registro del alcance y cerrar con commits, estado real del despliegue y QA pendiente.


## FO-CHG-012 / VIS-015 — GPS paralelo, textos plegables y escala UI (2026-10-11)
Solicitado con capturas Android del flujo Exploración presencial e Inteligencia de operadores. Se confirma que el bloqueo GPS provenía de validar state.gps antes de finalizar la búsqueda, a pesar de que el botón ya estaba intentando obtener la posición.
Regla funcional corregida: state.gpsCapturePending = true sólo mientras se intenta capturar GPS en el paso Coordenada de un formulario de Exploración. Se permite pulsar Continuar sin una posición únicamente cuando se sigue en ese paso y existe captura activa (si hay texto manual editado no aplicado, la validación sigue rechazándolo). La captura/consulta territorial continúa en segundo plano; los pasos posteriores siguen accesibles. La revisión final valida state.gps obligatoriamente y espera los datos territoriales necesarios; si falla el GPS, no se enviará un formulario sin coordenada. Se restablece el estado pendiente tanto en éxito como error, sin autoavance y sin cambiar servicios de geolocalización.
Navegación móvil: cinco pasos en carrusel horizontal; sólo el activo conserva título con ancho y ellipsis, los demás muestran círculos numéricos; se centra el activo horizontalmente sin desplazar la página. Sin superposición entre Infraestructura/Operadores/Evidencia.
Descripciones: descripción del formulario e instrucciones iniciales dentro de <details> con estado cerrado por defecto. Cada descripción de sección es otro <details> cerrado, oculto si no hay descripción; títulos siempre visibles. Leyenda informativa «Este correo quedará asociado automáticamente a la respuesta» eliminada de la interfaz; identidad y asociación en lógica sin cambios.
Estándar: CSS variables --fbz-ui-control-h:40px, --fbz-ui-btn-font:12px, --fbz-ui-input-font:16px, --fbz-ui-label-font:12px, --fbz-ui-help-font:11px, --fbz-ui-section-mobile:19px, --fbz-ui-gap:8px y --fbz-ui-field-gap:11px. Botones foto/galería, campos editables y acciones consistentes. No sobrescribir manualmente controles semánticos, textarea o librería de mapas.
Ámbito: implementado en FIBRAZO Forms y su flujo de Exploración/Inteligencia de Operadores. Otras aplicaciones (Competencia dashboard independiente, Impacto Social, Redmine, Socialización) deben consumir VIS-015 como criterio documental, pero NO se declaran actualizadas hasta implementar y verificar en sus propios repositorios.
Entrega planificada: una única PR/merge a main para minimizar publicaciones en Vercel, dado el pendiente FO-PEN-003 (10.06 GB). Validación de sintaxis JS, balance CSS, integridad ids y pruebas de estados GPS antes de fusionar. QA Android real/cámara/permisos y confirmación Vercel READY pendientes.

## FO-CHG-013 / VIS-016 — Filtros del mapa y estado en línea con límites claros (2026-10-11)
Entrada: capturas Android 11:17 (Mapa con filtros que salen del viewport y controles sobredimensionados) y 11:18 (cabecera de Exploración Presencial: «En línea»/contador sin bloque distinguible). El usuario confirmó que FO-CHG-012 funciona mucho mejor y solicitó esta tanda visual.
Causas identificadas: los selects heredan font:inherit y min-content (texto largo fuerza tamaño), la cuadrícula de filtros no impone min-width:0 a hijos y las fechas/control foto carecen de anchuras seguras. En la barra de formulario, .workspace-status estaba display:contents para colocar el enlace «Base de datos» junto al botón de regreso; eso impide dibujar un contenedor visual alrededor de «En línea» y «1 de 5».
Implementación: delimitación del panel de filtros con borde auxiliar 2px #A5BFB0, padding 9px; cuadrícula 4 columnas escritorio, 2 tablet/móvil y 1 sólo <=340px. Hijos min-width:0/max-width:100%/box-sizing:border-box, selects y fechas 39-40px, texto 12-13px con truncamiento dentro de su límite, foto checkbox ~17px y botón Limpiar filtros 37px. Mantener aria-label, filtros y fechas nativos; no modificar la lógica de filtro.
Se mueve el vínculo «Base de datos» como hijo de .workspace-topbar (mismo ID y URL, ninguna alteración funcional). Segunda fila .workspace-status se convierte en bloque real con borde #81998B, fondo #17241B y «En línea» + «n de 5» legibles. La barra completa tiene borde 2px; tarjeta de formulario e historial se separan con bordes auxiliares. Marcador CSS FBZ-MAP-FILTERS-STATUS-20261011-13.
Publicación: una única tanda (commit de GitHub, CSS/HTML/SW/registro audit), con versionado CSS ?v=20261011-13 y caché PWA fibrazo-forms-v0.8.90-20261011-14. Se mantiene pendiente FO-PEN-003; confirmar READY por commit antes de declarar desplegado. QA real en móvil 320/360/390/430px, select largo, fechas, fotos, regreso, enlace de BD, modos online/offline, foco teclado, y actividad en mapa. Colores de contorno son auxiliares UI, no paleta institucional.


## FO-CHG-014 / VIS-017 — paneles progresivos, recorrido y puntos por formulario (2026-10-11)
Solicitud de usuario con capturas móviles 11:46-11:48. Reglas operativas y de marca se mantienen en las fuentes canónicas:
- Identidad: https://docs.google.com/document/d/1vgYxAB-KhkhHMb-zd-eGJLk_UX6QcSjznZ2WnFRd9m8/edit
- UI transversal: https://docs.google.com/document/d/1prrIG6gikA7rfvadDz2xRF_PnnhtUtMZlJXOagflY_U/edit
- Gobierno documental: https://docs.google.com/document/d/1rH6nH6qsXolzkq04jCOmej8xeez0JJAJwnjiiiYS1Ps/edit
- Forms manual y cambios: carpeta https://drive.google.com/drive/folders/16sD2ScUH-TnaZ4HnXTZCPNmrWFsplpuU
Este registro no define una segunda norma visual: describe su aplicación puntual al código de Forms.

Cambios del formulario:
1. En Inteligencia de operadores, cada tarjeta ISP/Operador ahora es <details> cerrado por defecto, con resumen de nombre, número de fichas y calidad. El detalle de modelo, nomenclatura, marquilla, tensor, despliegue y fotos queda disponible al abrir. Se permite solo una ficha abierta por vez; cuando se elige una desde el listado territorial se abre la ficha correspondiente.
2. En Lectura de competencia, los chips de operador migran a un selector <details> inicialmente cerrado y de altura limitada. Presenta una lista vertical ordenada por cantidad y admite seleccionar uno, cerrando la lista y mostrando puntos/fotos ya existentes.
3. Últimas respuestas: panel cerrado por defecto; al abrir muestra 10 entradas más recientes por fecha. Botón Ver más indica el resto de elementos ocultos y despliega toda la lista en una tabla con scroll vertical interior de altura máxima 365px. Se puede volver a mostrar solo 10. Filtros existentes y permisos de la columna de usuario se mantienen.
4. Mapa: eliminada solo la nota informativa final «Mantén presionado…», sin quitar la pulsación larga ni otras acciones.
5. Recorrido: eliminado botón Detener independiente; Iniciar recorrido cambia a «■ Detener recorrido» y devuelve el control al detener, usando el mismo id de iniciar. Orden móvil compacto en 2 columnas, y opción Seguir mi ubicación en su propia fila. Se ignora respuesta GPS tardía tras detener para no añadir puntos una vez parado.
6. Formas por formulario: exploración virtual cuadrado (■), exploración presencial círculo (●), inteligencia de operadores triángulo (▲). Se preserva el color por categoría de ISP y se incorpora leyenda de formas y opción de filtro. La API /api/map ahora consume con permisos explícitos RESP_EXPLORACION y RESP_INTELIGENCIA_OPERADOR, esta última solo si el usuario puede acceder a dicho formulario. Para usuarios no administradores retorna únicamente los puntos que corresponden a su correo; descarta coordenadas faltantes o fuera de rango. CHURN no se representa porque el mapa es de relevamientos geolocalizados, no un mapa de respuestas sin ubicación.
7. Conteo de puntos visible rotulado «registros geolocalizados» para no confundir el total al mezclar dos fuentes.

Archivos: app.js, index.html, map-v01.js, api/map.js, brand-alignment.css, service-worker.js. Assets de nueva versión: app.js?v=2026.10.11.14, map-v01.js?v=2026.10.11.14, brand-alignment.css?v=20261011-14, caché PWA fibrazo-forms-v0.8.90-20261011-15.
Pruebas aisladas antes de fusionar: sintaxis de JS; integridad de IDs en HTML; CSS balanceado, ausencia del botón Detener y pie informativo; conteos 10/17 en resultados y texto «7 registros ocultos», orden temporal y scroll; 8 comprobaciones de autorización y fuentes de /api/map incluyendo usuario ajeno, sin GPS y permisos al formulario de inteligencia.
PENDIENTE: verificar despliegue producción READY con SHA de merge, prueba de UI Android real, alternar ruta GPS en campo, foto/permisos y compatibilidad PWA sin conexión. Reducir despliegues por cuota de Vercel FO-PEN-003.


## FO-CHG-015 — Desplegable de Biblioteca de operadores y cuadrícula compacta 2 × 2 (2026-10-11)
Solicitud: revisión positiva tras FO-CHG-014 con dos capturas Android a las 14:18/14:19. Usuario pide que el BLOQUE COMPLETO «Biblioteca de identificación / Inteligencia de operadores» sea desplegable, no sólo fichas individuales, y que «Seguir mi ubicación» ocupe una cuarta celda de tamaño idéntico al resto de los controles de mapa.

Aplicación visual: section.panel.operator-library conserva su posición pero ahora incluye details#operatorLibraryDisclosure sin atributo open y summary con título y acción Ver fichas/Ocultar fichas; todo lo demás (instrucción, buscador, fichas y fotos) está dentro del panel plegable. Se mantiene details anidado para cada ficha. Se conserva búsqueda operativa y respuesta a datos nuevos cargados, incluso cuando esté plegado. Al seleccionar un ISP desde Lectura de competencia, se abre automáticamente la biblioteca (y la ficha específica), borrando una búsqueda previa que podría dejar la ficha oculta; desplaza la pantalla a esa sección. No se alteran permisos ni respuestas.

Mapa: map-location-toolbar mantiene cuatro controles en este orden DOM/visual: Mi ubicación, Iniciar/Detener recorrido (el botón ya era contextual), Limpiar recorrido, Seguir mi ubicación. grid 2 columnas × 2 filas, gaps 8px, controles iguales de 40px de alto, ancho 100%, radius 9px. El último control sigue siendo label vinculado a input#mapFollowToggle con checkbox visible, alternancia original por cambio de input y estados JS de GPS intactos. En pantallas <=350 px se mantienen dos columnas y textos más compactos con font 10-10.5px. Visual de foco visible; los bordes son colores auxiliares de interfaz ya documentados, no nuevos tonos de marca.

Archivos: index.html, brand-alignment.css, app.js, service-worker.js, este audit. CSS ?v=20261011-15, app.js ?v=2026.10.11.15, caché PWA fibrazo-forms-v0.8.90-20261011-16. Referencia central: VIS-017 en https://docs.google.com/document/d/1prrIG6gikA7rfvadDz2xRF_PnnhtUtMZlJXOagflY_U/edit y registro del proyecto FO-CHG-015 en https://docs.google.com/spreadsheets/d/1InVJe0iR0-GAebf-SB5sa9fZRcNmm8N1ShU62Pu-YAc/edit. Este archivo es evidencia técnica específica del repositorio, NO una segunda norma visual.

Estados independientes a registrar: integración en main; Vercel READY y commit SHA; revisión real de controles en Android en 360/390/430 px; apertura y cierre de biblioteca, búsqueda, selección desde competencia, cambio de estado de checkbox, iniciar/detener GPS y PWA offline. Realizar publicación agrupada por cuota Functions Storage FO-PEN-003. No declarar prueba móvil en campo sin confirmación.


## FO-CHG-016 / VIS-019 — Contraste administrativo y ayudas emergentes reutilizables (2026-10-11)
Contexto: capturas móviles usuario 14:51–14:52 muestran administradores blancos en tema oscuro, email/permisos casi ilegibles, permiso grid desbordado y aclaraciones muy largas.
Norma compartida (fuente ÚNICA, no duplicar): https://docs.google.com/document/d/1prrIG6gikA7rfvadDz2xRF_PnnhtUtMZlJXOagflY_U/edit — VIS-019, v1.4. Gobierno: https://docs.google.com/document/d/1rH6nH6qsXolzkq04jCOmej8xeez0JJAJwnjiiiYS1Ps/edit .
Aplicación Forms específica:
- admin-v03.js: tarjetas individuales de administradores siguen siendo details cerradas por defecto, se preserva su estado cuando se actualiza cualquier checkbox. Los permisos por formulario pasan a details anidados, con resumen del nombre/ID y conteo de los cuatro permisos, y estado de expansión restaurable. Al expandir: Ver, Editar, Permisos y Base de datos; 2x2 en móviles y 4 columnas escritorio.
- Permisos de administradores base: casillas deshabilitadas como antes; lectura de estado sin borrar ni modificar acceso. Eventos data-perm, data-user-create, data-remove-admin y API /api/admin originales sin cambios de lógica.
- Ayuda (?) contextual de FO-CHG-016: botones type=button, etiqueta aria-label y aria-expanded, ventana flotante única #fzHelpPopover montada directamente en document.body (sin recorte del panel), texto vía textContent y cierre por botón, Escape o clic fuera. Pantalla angosta: popup dentro del viewport abajo. El popover no cambia permisos ni publica formularios. Se aplica en reglas de acceso, encabezado administrativo, crear/agregar administradores, dominios, correos específicos, acceso público y toggles de experiencia. Estados/errores críticos siguen visibles.
- CSS: .admin-person-permissions y tarjetas de permisos corrigen el fondo blanco heredado a tema oscuro institucional, bordes legibles, foco visible, entradas y casillas compactas; etiquetas no se ocultan. index.html agrega ayudas y bust de assets brand-alignment.css?v=20261011-16 y admin-v03.js?v=2026.10.11.16. Caché service worker fibrazo-forms-v0.8.90-20261011-17.
- Documentación: manual Forms y registro local FO-CHG-016, matriz VIS-019 de preferencias (es referencia local al estándar, no norma separada). Otros dashboards siguen pendientes de implementar/validar, aunque la norma es aplicable a todos.
- Verificaciones previas: 17 comprobaciones estáticas de JS parse, CSS equilibrado, markup de permisos, readonly admin base, help accesible y cache bust; pendiente prueba Android real de apertura/cierre/foco/contraste y publicación Vercel READY.
No se cambian valores en Sheets de usuarios/permisos ni su contrato de API.

## FO-CHG-023 — Última pregunta QA y panel del mapa contenido (2026-10-14)
La bandera privada «¿Este registro es una prueba?» se integra como única última pregunta del último paso, antes de «Revisar respuestas». No se muestra en secciones anteriores ni se repite en revisión; conserva `No` predeterminado, autorización exclusiva de `eduardo@fibrazo.com` y validación existente del servidor.

El mapa mantiene sus tres pestañas, pero cada contenido se ordena verticalmente. Referencia agrupa en desplegables independientes los índices de estratos, formas de los elementos y operadores. El panel se limita a la altura/ancho del mapa, usa scroll interior y conserva radio uniforme en sus cuatro esquinas. Se retiran los badges redundantes sobre la búsqueda; buscador, título, textos y botones se alinean con márgenes compactos. No se modifican formularios funcionales, permisos, datos ni endpoints.

## FO-CHG-024 — Corrección de precedencia CSS observada en Preview (2026-10-14)
La prueba autenticada del despliegue `f6f9b245` mostró que la hoja transversal `brand-alignment.css`, cargada después de `styles.css`, todavía imponía cuatro columnas a `#mapFiltersPanel .map-filters` con mayor especificidad y `!important`. La regla canónica se cambia a una sola columna para todos los anchos, conservando el listado vertical solicitado. También se elimina el borde interior cuadrado del buscador y se reduce su alto efectivo, manteniendo el contenedor exterior redondeado. El cambio es exclusivamente visual y no modifica valores, eventos, filtros, permisos, formularios ni persistencia.

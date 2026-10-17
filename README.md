# FIBRAZO Forms · v0.8.14

Centro interno de formularios, relevamientos y resultados de FIBRAZO.

## Arquitectura

- **Forms** administra formularios, usuarios, permisos, respuestas originales, evidencias y seguridad.
- **Maestro Territorial Central** es el router geográfico único para ciudad/municipio y para seleccionar el archivo territorial de cada ciudad.
- **Bases territoriales por ciudad** contienen las capas canónicas de barrio, estrato, troncal y límite municipal.
- **Competencia** conserva la fuente maestra de operadores, ISP y presencia competitiva.
- Los **proyectos ciudad** pueden recibir resultados procesados cuando corresponde, sin reemplazar la respuesta original guardada en Forms.

La respuesta enviada por el usuario se conserva en `RESP_*`. El enriquecimiento territorial se registra en columnas independientes con estado, asignación exacta, polígono cercano y distancia.

## Fuente de verdad de las preguntas

Mientras no exista un editor/builder de preguntas en Administración, la configuración productiva de preguntas vive en:

`forms-config.js`

La hoja `PREGUNTAS` de Google Sheets se conserva como referencia histórica/documental y **no modifica el formulario productivo**.

## Formularios activos

- **Churn** — visitas a clientes que dejaron de recargar.
- **Exploración virtual** — Street View, infraestructura, operadores/ISP y enriquecimiento territorial por coordenadas.
- **Exploración presencial** — GPS, infraestructura, operadores/ISP y evidencia fotográfica.

## Geografía · Motor territorial v3.2

El enriquecimiento automático sigue una regla única:

- **DENTRO**: asigna el polígono exacto.
- **FUERA**: no asigna; informa el polígono canónico más cercano y la distancia al borde.
- **SIN_CAPA**: no existe una capa disponible.
- **SIN_CAPA_CANONICA**: existen datos, pero ninguno está habilitado como canónico.

La proximidad es contextual y nunca sustituye una pertenencia exacta.

El frontend consulta `/api/exploration`, y el backend vuelve a resolver la geografía al guardar la respuesta. De esta manera una respuesta offline o manipulada en el navegador no puede reemplazar el resultado territorial del servidor.

La integración usa:
- Maestro Central: `01_CIUDADES`.
- Archivo territorial seleccionado por el Maestro.
- `11_POLIGONOS_CIUDAD` para el ámbito municipal.
- `02_BARRIOS`, `03_ESTRATOS` y `04_TRONCALES` únicamente con `Preferida_Analisis=TRUE` y calidad oficial/validada cuando existe ese campo.

Las capas históricas o candidatas no se presentan como asignaciones automáticas.

## Trazabilidad de respuestas

`RESP_EXPLORACION` conserva las columnas históricas y agrega desde `AK`:
- versión territorial;
- ID de ciudad/catálogo y archivo territorial;
- estado, asignado, cercano y distancia para ciudad;
- estado, asignado, cercano y distancia para barrio;
- estado, asignado, cercano y distancia para estrato;
- estado, asignado, cercano y distancia para troncal.

El proyecto operativo **Bucaramanga-Exploración** se conserva como destino de sincronización para puntos AMB, pero ya no actúa como fuente geográfica.

## Datos y evidencias

- Respuestas: Google Sheets `FIBRAZO Forms - Base de datos`.
- Fotos: Google Drive.
- Máximo configurable: hasta 3 fotos por respuesta.
- Las respuestas offline se almacenan temporalmente en el dispositivo y se sincronizan al recuperar conexión.

## Acceso y seguridad

La configuración se administra desde **Administrar**.

Permisos:
- **Ver**: puede abrir el formulario.
- **Editar configuración**: puede cambiar estado, experiencia y evidencia; no modifica preguntas.
- **Permisos**: puede administrar accesos/publicación.
- **Base**: puede abrir la hoja de respuestas.

Los modos de acceso son `PRIVADO`, `CORREOS`, `DOMINIO` y `PUBLICO`.

## PWA y sesión

- PWA instalable con service worker.
- Cola offline persistente en IndexedDB.
- Firebase usa persistencia local.
- Ante fallas transitorias de red, puede reutilizar permisos previamente validados en el dispositivo durante un período acotado.

## Producción

Vercel: https://fibrazo-forms.vercel.app/

Versión: **0.8.14**

## Flujos

El mapa maestro se mantiene en:

`docs/FIBRAZO_Forms_Flujos.drawio`


## QA preventivo — 14/10/2026 (no publicado en producción)
- Motor territorial v3.3 en rama QA: pertenencia exacta prioritaria; municipio cercano <=20 km, barrio/estrato <=5 km, troncal <=10 km; fallo de fuentes registrado y FUERA_COBERTURA sin suposiciones. Caché V2 con expiración de cinco minutos.
- Dashboard pendientes: GET /api/pending autenticado, única fuente FIBRAZO Forms - Automatizaciones y control / PENDIENTES; servidor 90 s, cliente 120 s; activos se cuentan, pausados se distinguen, cerrados se excluyen. Sin escrituras de estado ni fallback falso. Requiere validación E2E de permisos y lectura de cuenta de servicio.
- Cambios trazados en FO-CHG-030 (capas), FO-CHG-031 (territorial) y FO-CHG-032 (pendientes); documentación ampliada en docs/FLOW_SYNC.md y docs/brand-compliance-audit.md.


### FO-CHG-033 — Panel Capas compactado, estratos predeterminados y controles fijos (15/10/2026)
En QA, Estratos se inicia con 1, 2 y 3 seleccionados (estrato 0 no figura en las opciones). Se oculta el control Leaflet +/− preservando zoom por gestos. El panel se ancla arriba a la izquierda; abierto se cierra con «−» y contraído solo muestra «☰» para abrir. Se elimina arrastre del panel; Barrios/Estratos se representan como listas desplegables compactas con indicador, sin divisores repetidos, manteniendo búsqueda y selección múltiple. Cambios: map-v01.js, map-controls-ui.js, styles.css, index.html y service-worker.js. Solo rama feat/forms-map-qa-20261013; quedan pruebas visuales desktop/móvil y confirmación de publicación Preview READY; producción no tocada.


### FO-CHG-036 — Herramientas, filtros y Troncales (15/10/2026)
- UX QA: lupa se desplaza a la derecha del panel cuando está abierto y queda junto a la hamburguesa cuando se cierra; Mi ubicación se sitúa abajo a la derecha para no tapar botones superiores; los controles de recorrido se identifican en su menú desplegable.
- Cabeceras de Barrios, Estratos y Troncales: control ocular accesible con ojo tachado para «Ocultar todo» (si hay selecciones) y abierto para «Mostrar todo» (si no hay ninguna). Se conservan casillas y búsquedas independientes; un botón por capa, sin repetir «Limpiar».
- El selector de ciudad consulta /api/map-city-catalog con permisos de dashboard y enumera los Municipios_Ambito de las filas ACTIVAS del catálogo corporativo 01_CIUDADES (no solo ciudades con puntos en pantalla). Tipo de formulario, operadores y usuarios quedan condicionados por la selección de ciudad y se presentan como desplegables compactos.
- La capa Troncales cuenta con soporte de API para 04_TRONCALES y líneas WKT; su selector informa «Sin troncales registradas» porque en la fecha de revisión 04_TRONCALES tenía encabezados pero cero filas. No se simulan trazados.
- Las geometrías actualmente servidas por /api/map-polygons son del maestro territorial de Bucaramanga; al seleccionar otras ciudades aparece una advertencia de cobertura, sin asumir disponibilidad nacional de barrios/estratos/troncales. No modificar la fuente geográfica ni reportar capa vacía como error de puntos.
- QA pendiente: validar desplazamiento en móvil/escritorio, controles GPS/recorrido, lectura API con usuario autorizado, casillas y los estados de ojo, todas las ciudades de catálogo, condiciones por ciudad, ausencia de troncales, y visualizar geodatos reales cuando Ingeniería cargue troncales. Rama feat/forms-map-qa-20261013, sin producción.


## PROTOCOLO DE CONTINUIDAD ENTRE CHATS — FIBRAZO Forms (15/10/2026)

Objetivo: prevenir pérdida de contexto, lentitud y reconstrucción innecesaria del trabajo de FIBRAZO Forms al utilizar conversaciones extensas.

Al comenzar un chat nuevo del proyecto: (1) revisar documentación general, README, CHANGELOG/registro de cambios y hoja PENDIENTES, así como la última rama y entorno QA; (2) recuperar el último resumen de continuidad o decisiones pertinentes disponibles; (3) hacer una evaluación cualitativa del volumen y complejidad del chat actual y comunicar si conviene continuar o migrar.

Clasificación orientativa: BAJA, MEDIA, ALTA o MUY ALTA. No implica acceso a un medidor real, porcentaje de tokens/contexto restante, consumo de memoria o rendimiento de la plataforma. No inventar porcentajes ni afirmar que se controla automáticamente en segundo plano. Evaluar por extensión acumulada, número de tareas y cambios, archivos, capturas, consultas a herramientas, riesgo de perder decisiones y señales de latencia observadas; sin medición directa, reconocer incertidumbre.

En carga BAJA/MEDIA, continuar. En ALTA, recomendar preparar traspaso al cerrar la tarea actual. En MUY ALTA, recomendar un nuevo chat y preparar inmediatamente un resumen verificable. Avisar proactivamente cuando el volumen sea significativo durante el trabajo, sin interrumpir innecesariamente tareas críticas.

Resumen mínimo de traspaso: nombre y objetivo del proyecto, estado exacto y fecha de revisión, decisiones aprobadas, cambios efectivamente aplicados versus propuestas o pruebas pendientes, enlaces oficiales QA y producción, rama/commits relevantes, documentación maestra, Changelog y tickets/pendientes con IDs, dependencias, próximos pasos y precauciones. No confundir READY con QA funcional validado ni decir que producción cambió si solo se actualizó la rama de prueba. Priorizar referencias corporativas y verificar su estado actual.

Esta es una instrucción operativa documentada para futuras conversaciones del proyecto, no una función automática de medición de contexto o notificación autónoma. En el nuevo chat corresponde consultar este protocolo y aplicarlo.


### FO-CHG-037 — Alineación visual corporativa y contraste (15/10/2026)
La guía de estilo FIBRAZO establece verde #43FFA5, negro #000000, gris #58595B, Montserrat para comunicaciones y Poppins en tablas. Se adapta el tratamiento de superficies del Dashboard de Impacto Social a un sistema oscuro de alto contraste: superficies opacas y diferenciadas (#0B110F, #101B15, #14231B, #172820), texto principal blanco, bordes discretos, campos claramente distinguibles y color de marca como acento. La guía de marca documental no define tokens exactos de interfaz; estos fondos son adaptaciones de UI y no nuevos colores oficiales.
Impacto Social: rama independiente feat/brand-solid-contrast-20261015, sin modificar GitHub Pages productivo. Forms: rama feat/forms-map-qa-20261013, estilos de todas las superficies comunes, formularios, filtros, tablas y ventanas emergentes del mapa; se mantienen estados de alerta, leyendas geográficas y colores semánticos cuando su función lo exige. No se modifican datos ni reglas de negocio. Pendiente de aprobación: inspección real en escritorio/móvil, estados de inputs y modales, leyendas/contrastes de gráficos, contraste AA, PWA y login antes de producción.


## Cierre documental y traspaso — FO-CHG-038/039 (15/10/2026)
**FO-CHG-038 — Jerarquía visual de fondos (QA):** grandes paneles y encabezados conservan verde oscuro sólido (#101B15); controles pequeños, filas, tarjetas y acordeones internos, campos y popups del mapa adoptan oscuro sólido (#090F0C) con texto blanco. Cambios en brand-alignment.css, index.html y service-worker.js. Sin cambios de negocio ni producción.
**FO-CHG-039 — Controles del mapa (QA):** referencia con superficies oscuras y letras blancas; menú de iniciar/limpiar/seguir recorrido presentado verticalmente; listados de filtros con casillas como las capas; Barrios y Estratos sin marcos internos decorativos, menos márgenes y sin puntos verdes en el listado de barrios. Cambios en map-controls-ui.js, brand-alignment.css, index.html y service-worker.js.
**Validación pendiente:** el código y el registro corporativo están actualizados, pero hace falta comprobar en navegador la compilación más reciente de QA, la legibilidad y funcionalidad en escritorio/móvil, GPS/recorrido, selectores múltiples, capas y modos de mapa. No afirmar que la última revisión se ve en el enlace QA hasta que el alias apunte a un despliegue READY con los cambios; producción sigue sin autorización.
**Continuidad:** seguir el PROTOCOLO DE CONTINUIDAD ENTRE CHATS de README; consultar FO-CHG-030 a 039 y FO-PEN-013 a 016; usar rama feat/forms-map-qa-20261013, el Manual corporativo y el Changelog como fuente de verdad; no repetir trabajos ya cerrados.


### FO-CHG-047 · Piloto QA de disolución de estratos (16/10/2026)
- Se habilita **solo en la rama QA**, con casilla «Prueba QA: unificar polígonos por estrato» en los controles de Estratos; desactivada por defecto. No modifica el maestro territorial `03_ESTRATOS`, ni la clasificación de puntos, ni producción.
- La API `/api/map-polygons?mode=geometry&layer=estratos&qaDissolve=1` usa `polygon-clipping` para una unión topológica por valor de estrato en las geometrías efectivamente recibidas para la vista; ante fallas de unión, retorna las entidades originales de ese estrato.
- El estado visual indica cantidad de geometrías originales y optimizadas y advierte si la vista está incompleta por el límite/muestreo existente (650 con una ciudad). Reducir objetos de dibujo **no garantiza disminuir vértices transferidos ni completar zonas omitidas**. Las superficies separadas permanecen como componentes de una multiparte.
- **No se aplican buffers, cierres de huecos ni tolerancias**. Un espacio real sin cobertura sigue sin estrato; la corrección de asignación de puntos próximos a límites debe estudiarse como cambio independiente sobre el motor territorial, con distancia máxima, mismo estrato a ambos lados, exclusión de superposiciones y pruebas de precisión.
- QA pendiente: despliegue Vercel READY y pruebas autorizadas con geometrías reales, medición de tiempos/peso GeoJSON/vértices, comparación original/optimizada a diferentes zooms, geometría válida y controles de selección. Mantener desactivado si da errores o hay truncamiento significativo.


### FO-CHG-049 · Mapa estratos Neiva, Villavicencio e Ibagué (16/10/2026, QA)
- Fuentes: KMZ por ciudad, paquetes originales SHP y polígonos disueltos por estrato (EPSG:4326), conservados en la unidad compartida Growth / Exploracion, archivo `ESTRATOS_Neiva_Villavicencio_Ibague_QA_2026-10-16.zip`, ID `1iLbZP5F-xJB2DRbXTDM9Mu5IoxvvRmro`. Conteos: Neiva 4.021; Villavicencio 5.065; Ibagué 4.578. Estratos 1/2/3.
- Catálogo corporativo `01_CIUDADES`: NVA, VVC e IBG en estado `QA_ESTRATOS`, habilitados para **selección de ciudad únicamente en el mapa QA**, no en producción. El estado de Estratos es `QA_CAPA_ESTRATOS_GEOMETRIA`, **no** significa clasificación territorial canónica.
- Una planilla territorial por carpeta de ciudad: `RESUMEN_ESTRATOS` (cantidades, bbox y vínculo a artefacto completo); `03_ESTRATOS` con encabezado canónico sin las filas WKT todavía; `02_BARRIOS`, `04_TRONCALES` y `11_POLIGONOS_CIUDAD` reservadas sin datos. Las geometrías completas están en SHP/GeoJSON, **no** en las hojas de resumen.
- Adapter QA `api/_estratos-precalc.js`: usa `adm-zip` para leer de Drive el GeoJSON previamente disuelto, filtra los componentes multipolígono por intersección de bbox y entrega los visibles con compresión gzip; sin muestreo truncado. Ruta `/api/map-polygons` respeta autenticación y permisos. `qaDissolve` sigue siendo el experimento de Bucaramanga; estas tres ciudades presentan la capa precalculada por defecto.
- Mapa: al seleccionar Neiva, Villavicencio o Ibagué sin puntos registrados, centra su extensión y actualiza cabecera y botón «Ver ciudad». No cambia reglas de puntos/territorial ni producción.
- **Límite**: el router de asignación de municipio/barrio/estrato/troncal a puntos aún no dispone de las filas originales WKT ni polígonos municipales en las planillas nuevas. No afirmar precisión o cobertura canónica; requiere validación adicional antes del trabajo de campo.
- Pendiente: confirmar despliegue Vercel READY; E2E autenticado con cuenta de servicio sobre ZIP; comparar respuesta/index/zoom/pan, métricas transferencia y el estado del control QA en móvil/escritorio. No publicar producción sin autorización.


### FO-CHG-050 · Cobertura completa de estratos de Bucaramanga y recarga QA (17/10/2026)
- Diagnóstico: API anterior dibujaba una muestra espacial de hasta 650 de los polígonos visibles de Bucaramanga, creando huecos artificiales. La disolución previa se aplicaba **después** del muestreo y, por lo tanto, no podía recuperar los omitidos. Neiva/Villavicencio/Ibagué no tienen ese problema porque consultan multipolígonos precalculados.
- Solución de transporte (rama QA): `/api/map-polygons?layer=estratos&fullCoverage=1&page=N` permite recorrer todos los polígonos visibles de Bucaramanga en lotes de hasta 300 sin muestreo. El frontend pide hasta tres lotes en paralelo, los agrega y dibuja el resultado completo; durante la recarga preserva lo que ya estaba en pantalla. Se admite un máximo defensivo de 40 páginas por vista; la fuente actual de 9.570 polígonos cabe en 32 páginas como máximo.
- Modo unificado QA: usa `polygon-clipping` para disolver polígonos contiguos del mismo estrato **dentro de cada lote**. Esto reduce objetos visuales, pero todavía no equivale a un SHP consolidado completo sin fronteras entre lotes. Las geometrías no se expanden y los pequeños huecos reales permanecen. No se modifica ni se sustituye el maestro de Bucaramanga ni la clasificación de puntos.
- UI: botón permanente `Unificar estratos (QA)` en la cabecera del mapa, a la derecha de `Actualizar`; al seleccionar Bucaramanga activa por defecto la comparación optimizada y permite volver a la vista original completa. En Neiva/Villavicencio/Ibagué indica que los estratos precalculados ya están unificados.
- `Actualizar`: reconsulta puntos y capas visibles, invalida la caché del cliente, añade identificador de recarga a las peticiones y fuerza recarga de metadatos del servidor para los índices; mantiene las capas renderizadas hasta recibir sustitutos y muestra estado de progreso.
- Validaciones de código: sintaxis JS (map-v01 y map-polygons), ID único del nuevo control, paginación y caché. Pendiente QA autenticada, medición de latencia/errores, comparación visual de zoom/pan y verificación de despliegue Vercel READY antes de promover cambios. `main` y producción **no modificados**.
- Mejora definitiva posterior sugerida: disolución completa **offline** de la fuente de 9.570 geometrías de Bucaramanga, derivado versionado y servicio por teselas o ventanas. Paginar completa cobertura resuelve el muestreo pero puede aumentar solicitudes y coste de dibujo respecto a la capa ya precalculada de las otras ciudades.


### FO-CHG-051 · QA: botón de unión visible en mapa fullscreen (17/10/2026)
- Causa del control invisible: el botón `mapQaOptimizeToolbar` estaba ubicado en la cabecera externa del mapa, mientras que la vista fullscreen usa exclusivamente la barra interna `.map-quick-actions`. Además, `map-controls-ui.js` oculta explícitamente algunos botones de cabecera.
- Se incorpora `mapQuickEstratoUnion` en la barra realmente visible, junto a «Satélite» y «Actualizar», conectado al único estado `qaDissolveEstratos` y al checkbox `mapEstratoOptimizePilot`. Se muestra solo cuando el selector contiene una única ciudad del AMB (Bucaramanga, Floridablanca, Girón o Piedecuesta); informa activo/inactivo con `aria-pressed`.
- El piloto arranca en modo **original, sin unión activada por defecto**, para poder comparar con la unión QA por lotes tras pulsar el botón. En otras ciudades la visualización ya está precalculada y unificada; no se presenta una comparación falsa.
- Alcance de rendimiento: una disolución por página de respuesta no elimina las solicitudes al maestro ni reduce necesariamente el total de vértices; la mejora definitiva requiere un derivado completo precalculado, simplificado por zoom y versionado. No usar el número de objetos finales como única métrica: medir bytes, vértices, tiempo API y tiempo de dibujo.
- Código, sintaxis, unicidad de botón, binding y caché de cliente comprobados; pendientes publicación READY y prueba funcional visual autenticada.


### FO-CHG-052 · Capa AMB disuelta offline, entregada por separado (17/10/2026 · QA)
- Se exportó el maestro territorial **corporativo** `FIBRAZO_Territorial_Bucaramanga_AMB / 03_ESTRATOS`, 9.570 filas de origen, sin alterar ese Sheet. **6.901** filas poseen estrato clasificado (1 a 6), **2.669** son «Sin información» y no forman parte de la capa cromática. Una geometría clasificada inválida (`BGFP_POL_06206`, estrato 4, Floridablanca) se reparó topológicamente con `make_valid`; no se rellenaron vacíos.
- Dissolve exacto por **municipio y estrato** y tres niveles visuales: `full` (sin simplificación), `medio` (tolerancia aprox. 1,5×10^-5°), `general` (4×10^-5°). Los niveles reducido y medio son solo para render, nunca para clasificación de puntos; pequeñas diferencias de área por simplificación son esperables. La unión global por estrato produciría 6.808 componentes, pero la versión realmente publicada, separada por municipio, conserva **6.877 componentes** (Bucaramanga 3.923, Floridablanca 1.270, Girón 893 y Piedecuesta 791). La reducción geométrica física es pequeña; se transfieren como máximo seis objetos GeoJSON multiparte por municipio y se evitan miles de consultas al maestro.
- Derivado archivado en **unidad compartida Growth / Exploracion**: [FIBRAZO_AMB_estratos_precalculados_por_municipio_QA_20261017.zip](https://drive.google.com/file/d/11T-x0QBB9W1GYUf0AaAvB9f5yvsLIGfJ/view), ID `11T-x0QBB9W1GYUf0AaAvB9f5yvsLIGfJ`. Archivo ZIP comprueba capas `AMB/<ciudad>/<nivel>.geojson`, manifiesto con hash SHA-256 y cantidades. Versión anterior agregada en un solo mapa también archivada solo como copia QA.
- La rama `feat/forms-map-qa-20261013` añade `api/_estratos-amb-precalc.js`. Únicamente si `layer=estratos`, hay una ciudad del AMB seleccionada y `qaDissolve=1`, `/api/map-polygons` consulta el ZIP precomputado, **sin leer las 9.570 filas del Sheet ni disolver geometrías por solicitud**. Autenticación y autorización de dashboard permanecen. Se filtran componentes por bbox y estratos seleccionados y se comprime GeoJSON con gzip, cacheando ZIP y datos por 10 minutos por instancia. A zoom ≥15 usa `full`, a 13–14 `medio`, a 11–12 `general`.
- La opción «Estratos unidos (QA)» en la barra flotante superior derecha activa esta nueva ruta. Apagarla mantiene el modo original paginado sin muestreo, para comparación. El modo no modifica la interpretación territorial de puntos y no afecta producción.
- Medidas offline (una ciudad, seis estratos, pantalla potencialmente completa): Bucaramanga `full` 2,34 MB JSON / ~739 KB gzip; `medio` 1,05 MB / ~340 KB gzip; `general` 861 KB / ~276 KB gzip. No equivalen a benchmarks reales de latencia: medir en navegador, ya que conservar miles de partes renderizadas todavía puede ralentizar Leaflet.
- Pendiente: Vercel READY para último commit; QA autenticada con cuenta de servicio, lectura de ZIP nuevo y respuesta 200 de `index`/geometría; alternar con original y visualizar 1–6 estratos y zoom/pan, evaluar latencia y rendering; documentar hallazgos. Ningún despliegue a `main`/producción sin aprobación.


### FO-CHG-053 · Estratos sin clasificación excluidos del procesamiento (17/10/2026)
- El maestro `FIBRAZO_Territorial_Bucaramanga_AMB / 03_ESTRATOS` conserva íntegros sus 9.570 registros (6.901 estratos 1–6 y 2.669 «Sin información»). No se borró ni alteró ningún registro.
- La capa AMB precalculada de Growth **ya excluía** los 2.669 sin clasificación. Además, la carga original en `api/map-polygons.js` ahora descarta filas cuyo estrato no es exactamente 1–6 antes de indexarlas por límites o solicitar su WKT, tanto para la vista original como para el índice.
- Como la hoja sigue siendo la fuente de la vista original, `loadMeta` aún lee sus columnas de metadatos en bloque para localizar las filas; excluirlas de la red por completo requeriría usar un índice territorial derivado o una consulta materializada. La vista **unificada precalculada** no carga esos metadatos en cada solicitud.
- No se puede convertir áreas **separadas** de un estrato en un Polygon geométricamente conectado sin inventar corredores o rellenar áreas de otras categorías. El formato MultiPolygon ya agrupa partes desconectadas en un único Feature por estrato/municipio (hasta 24 Features en todo el AMB) sin alterar límites; siguen existiendo 6.877 componentes y muchos vértices para Leaflet.
- Optimización posterior para QA: teselas vectoriales por zoom con simplificación y geometrías recortadas por zona; evaluar rendimiento por bytes, vértices y renderizado, no solo Features. No modificar clasificación territorial canónica ni producción.


### FO-CHG-054 · Prueba comparativa con MultiPolygon completo, sin filtro por viewport (17/10/2026 · QA)
- Pedido: **antes de intentar teselas o recorte geográfico**, utilizar solo las geometrías multiparte ya disueltas, completas, en lugar de volver a pedirlas por cada zona visible. Se conserva el original como control de comparación.
- Conteos verificados del manifiesto del derivado Growth `FIBRAZO_AMB_estratos_precalculados_por_municipio_QA_20261017.zip` (ID `11T-x0QBB9W1GYUf0AaAvB9f5yvsLIGfJ`):
  - Bucaramanga 1: **348** originales → **344** componentes → **1 Feature MultiPolygon**; 2: **774** → **774** → **1**; 3: **1.251** → **1.249** → **1**. Total 1–3: **2.373** originales → **2.367** componentes → **3 Features**.
  - AMB 1: **661** originales → **650** componentes → **4 Features**; 2: **1.796** → **1.792** → **4**; 3: **2.475** → **2.470** → **4**. Total 1–3: **4.932** originales → **4.912** componentes → **12 Features**. Cada municipio se mantiene separado para no mezclar sus límites.
- Backend QA `api/_estratos-amb-precalc.js`: devuelve íntegro el `full.geojson` de la ciudad/estratos seleccionados, una Feature MultiPolygon por estrato, **sin filtrar componentes por bbox ni simplificar por zoom**. Evita calcular bboxes de cada parte y reconstruir las coordenadas; realiza unión cero veces durante la consulta.
- Cliente QA `map-v01.js`: en el AMB, el modo `Estratos unidos (QA)` es ahora el inicial, solicita datos completos con bbox/zoom normalizados solo para estabilidad de la clave (`-180,-90,180,90`, zoom 15). La API no filtra por esos parámetros. Guarda clave de ciudad+estratos cargada/en curso y evita reconsultar o redibujar durante desplazamientos y zoom. Cambiar selección, ciudad, modo o presionar **Actualizar** sí permite recargar. El modo original continúa cargando todos los polígonos vía páginas, para comparación.
- El estado del mapa informa **número de estratos, superficies y segundos de carga+dibujo**; se compara con el original, que muestra el mismo tiempo. No declarar aceleración verificada sin comparar mediciones de navegador autenticado; el dibujo de miles de componentes todavía puede ser costoso.
- El maestro sigue íntegro, se excluyen los **2.669 sin clasificación** de las capas de estratos, y no se generan corredores/huecos artificiales. No se afecta al motor de clasificación territorial de puntos.
- QA pendiente: despliegue Vercel READY de la última revisión, consulta API autenticada al archivo Growth, prueba de todos los estratos 1–6, alternancia original/unificado, observar segundos de carga+dibujo, desplazamiento y zoom, sin deformaciones. Producción sin cambios.


### FO-CHG-055 · Estratos completos en todas las ciudades QA y agrupación Bucaramanga + AMB (17/10/2026)
- Se extiende la **carga completa por municipio y selección de estratos**, sin recorte de bbox ni solicitud nueva durante pan/zoom, a Neiva (4.021 originales), Villavicencio (5.065) e Ibagué (4.578). `api/_estratos-precalc.js` envía íntegros sus MultiPolygon ya procesados (estratos 1–3), igual que la carga QA actual del AMB; `map-v01.js` conserva la capa por clave ciudad+estratos, no la redibuja al navegar. La fuente completa y sus SHP originales siguen versionados en Growth.
- Una **única opción visible «Bucaramanga + AMB»** sustituye Bucaramanga, Floridablanca, Girón y Piedecuesta por separado en el selector del **mapa Forms QA**. `api/map-city-catalog.js` agrupa nombres de municipios, y `map-v01.js` agrupa puntos, usuarios, tipos, operadores, KPI de ciudades y el encuadre territorial. Alias geográfico interno: `bucaramanga-amb`.
- `api/map-polygons.js` expande esa selección a los cuatro municipios para **Estratos originales, Barrios y Troncales**, sin modificar sus filas maestras; los originales se descargan por páginas para evitar muestreo espacial. No se mezclan ni reetiquetan sus identificadores internos, y la disponibilidad concreta de barrios/troncales depende de los datos originales y del filtro de la vista.
- En modo QA **unificado**, `api/_estratos-amb-precalc.js` toma las capas `full` existentes por municipio y agrupa todas las partes de un mismo estrato en **hasta seis Features MultiPolygon para todo el AMB** (una por estrato). No rellena huecos, no genera corredores, ni aplica una nueva unión topológica en la solicitud; solo agrupa las partes ya precalculadas. Incluye **6.901 polígonos clasificados originales**, sin procesar los **2.669 sin clasificación**. El modo original sigue disponible con el botón «Estratos unidos (QA)».
- `map-controls-ui.js` ya no muestra la advertencia obsoleta de que las otras ciudades no tienen estratos. Para Neiva/Villavicencio/Ibagué aclara que Barrios/Troncales siguen pendientes; en «Bucaramanga + AMB» la cobertura territorial corresponde a la fuente completa.
- **Cartagena** tiene 81 polígonos históricos (2022), `HISTORICO_2022` y `Preferida_Analisis=FALSE`. No se habilitan como capa actual ni se confunden con geometrías vigentes hasta que se valide su procedencia/vigencia. Otros municipios del catálogo sin estratos mantienen la indicación de falta de cobertura.
- Este cambio es **solo QA**. Criterios de aceptación: que aparezca una sola opción «Bucaramanga + AMB» y ningún municipio separado; estratos 1–6 AMB visibles en la misma selección; barrios/troncales y puntos de los cuatro municipios accesibles; Neiva/Ibagué/Villavicencio cargan y conservan estratos al desplazarse; comparar 3 y 6 estratos/tiempos, cambio de ciudad, Actualizar, permisos y autenticación. Validación visual E2E y Vercel READY pendientes antes de declararlo permanente o aplicar a producción.


### FO-CHG-056 · Inspección de cobertura y piloto histórico Cartagena (17/10/2026)
- Fuente de verdad: catálogo corporativo `FIBRAZO_Territorial_MASTER / 01_CIUDADES` (spreadsheet `1cVAEv60ZdDTcQoPmmiSbJV_gfhAXKwywbzf0F0WDp_0`) y pestaña `03_ESTRATOS` de cada archivo. La verificación de solo lectura mostró que **Montería, Sincelejo, Barranquilla, Santa Marta y Turbaco tienen únicamente la cabecera, cero geometrías de estratos**. El nombre **Turbo** usado en la solicitud no existe como ciudad territorial registrada y **no debe interpretarse automáticamente como Turbaco**.
- Se examinó `data.gpkg` en `2024-12 Monteria/QGIS - Monteria/Monteria` de Drive: contiene capas de operadores, zonas, scoring, NPS y encuestas, ninguna capa de estratos. No es una fuente equivalente. Búsquedas por KMZ/categoría en Drive corporativo tampoco localizaron capas de estratos para esas cinco ciudades. No fabricar cobertura ni publicar zonas sin estrato.
- Cartagena sí tiene 81 registros históricos de 2022 en `FIBRAZO_Territorial_Cartagena / 03_ESTRATOS`, fuente pública GIS GeoInformador (2022) con `Preferida_Analisis=FALSE`. De esos, 65 están clasificados 1–6 (1:22, 2:14, 3:14, 4:10, 5:4, 6:1); **16 = No residencial**, excluidos de la representación por estrato. Registro `HIST_CTG_EST_0049` requirió `make_valid` y quedó registrado en manifiesto. Se conservó intacto el Sheet original y se disolvió por estrato sin inventar áreas. El derivado QA tiene seis Features MultiPolygon completos y es **histórico, no apto para clasificación operativa de puntos ni para anunciar cobertura vigente**.
- Derivado auditado en Growth / Exploracion: [Cartagena_Estratos_Historicos_2022_QA_20261017.zip](https://drive.google.com/file/d/1iM1ClOL205PTpPekbn3apTpGCiPTGJe5/view), ID `1iM1ClOL205PTpPekbn3apTpGCiPTGJe5`, GeoJSON individual de 65 registros, GeoJSON unificado con seis grupos, SHA256 y manifiesto que registra 16 exclusiones.
- Rama QA `feat/forms-map-qa-20261013`: nuevo adaptador `api/_estratos-ctg-historic.js`, conectado en `api/map-polygons.js` solo cuando hay una ciudad «Cartagena» seleccionada. Mantiene autenticación/permisos del mapa; entrega `index` y `geometry` completos y comprimidos desde Growth, sin bbox ni zoom y sin leer filas WKT por solicitud. Frontend enfoca la ciudad, conserva la capa en pan/zoom, y muestra la advertencia visible **«HISTÓRICO 2022 · SOLO QA · vigencia no validada»**; panel advierte explícitamente el uso exclusivo de referencia visual.
- Montería/Sincelejo/Barranquilla/Santa Marta/Turbaco/Turbo: **PENDIENTE DE KMZ, SHP o GeoJSON de estratos correctamente atribuidos, procedencia y vigencia**, antes de generar uniones y enlazar la API. No añadir falsos índices por estrato. Los archivos territoriales existentes y reglas de negocio del motor de clasificación continúan sin cambios.
- Criterios QA pendientes: despliegue READY del commit funcional, respuesta index/geometry 200 con cuenta de servicio, validación visible de advertencia, integridad de 65 geometrías y selección 1–6, latencia, no clasificación de puntos. Producción sin cambios y estado permanente pendiente de aceptación.

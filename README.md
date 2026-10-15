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
